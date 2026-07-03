'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { Prisma }            from '@prisma/client'

// Regras de domínio compartilhadas — NENHUMA regra de negócio definida aqui
import {
  canMoveToLot,
  shouldUpgradeToCowByLot,
} from '@/modules/shared/domain/animal-rules'
import { auditCreate, auditUpdate, auditDeactivate } from '@/lib/audit'

import {
  createLotSchema,
  updateLotSchema,
  moveAnimalToLotSchema,
} from './schema'
import type { ActionResult } from './types'

// ─── Criar lote ────────────────────────────────────────────

export async function createLot(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = createLotSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    // Valida que o pasto pertence à fazenda (se informado)
    if (parsed.data.pastureId) {
      const pasture = await prisma.pasture.findFirst({
        where:  { id: parsed.data.pastureId, farmId },
        select: { id: true },
      })
      if (!pasture) return { success: false, error: 'Pasto não encontrado nesta fazenda' }
    }

    const lot = await prisma.lot.create({
      data: {
        farmId,
        name:         parsed.data.name,
        type:         parsed.data.type,
        maxCapacity:  parsed.data.maxCapacity  ?? null,
        pastureId:    parsed.data.pastureId    ?? null,
        observations: parsed.data.observations ?? null,
      },
      select: { id: true },
    })

    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'Lot',
      entityId: lot.id,
      after: {
        name:        parsed.data.name,
        type:        parsed.data.type,
        maxCapacity: parsed.data.maxCapacity ?? null,
        pastureId:   parsed.data.pastureId   ?? null,
      },
    })

    revalidatePath('/lots')

    return { success: true, data: { id: lot.id } }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'Já existe um lote com esse nome nesta fazenda.' }
    }
    console.error('[createLot]', error)
    return { success: false, error: 'Erro ao criar lote. Tente novamente.' }
  }
}

// ─── Editar lote ───────────────────────────────────────────

export async function updateLot(
  lotId:   string,
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = updateLotSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.lot.findFirst({
      where:  { id: lotId, farmId },
      select: { id: true, name: true, type: true, maxCapacity: true, pastureId: true, observations: true },
    })
    if (!existing) return { success: false, error: 'Lote não encontrado' }

    // Valida pasto (se informado)
    if (parsed.data.pastureId) {
      const pasture = await prisma.pasture.findFirst({
        where:  { id: parsed.data.pastureId, farmId },
        select: { id: true },
      })
      if (!pasture) return { success: false, error: 'Pasto não encontrado nesta fazenda' }
    }

    await prisma.lot.update({
      where: { id: lotId },
      data: {
        name:         parsed.data.name         ?? undefined,
        type:         parsed.data.type         ?? undefined,
        maxCapacity:  parsed.data.maxCapacity  ?? undefined,
        pastureId:    parsed.data.pastureId    ?? undefined,
        observations: parsed.data.observations ?? undefined,
      },
    })

    const { id: _id, ...beforeFields } = existing
    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Lot',
      entityId: lotId,
      before:   beforeFields,
      after:    parsed.data,
    })

    revalidatePath('/lots')
    revalidatePath(`/lots/${lotId}`)

    return { success: true, data: undefined }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'Já existe um lote com esse nome nesta fazenda.' }
    }
    console.error('[updateLot]', error)
    return { success: false, error: 'Erro ao atualizar lote. Tente novamente.' }
  }
}

// ─── Desativar lote ────────────────────────────────────────

export async function deactivateLot(
  lotId:  string,
  farmId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const lot = await prisma.lot.findFirst({
      where:  { id: lotId, farmId },
      select: { id: true, isActive: true, _count: { select: { animals: { where: { status: 'ACTIVE' } } } } },
    })
    if (!lot) return { success: false, error: 'Lote não encontrado' }

    if (lot._count.animals > 0) {
      return {
        success: false,
        error:   `Não é possível desativar: o lote possui ${lot._count.animals} animal(is) ativo(s). Remova todos primeiro.`,
      }
    }

    await prisma.lot.update({
      where: { id: lotId },
      data:  { isActive: false },
    })

    auditDeactivate({
      farmId,
      userId:   session.user.id,
      entity:   'Lot',
      entityId: lotId,
      before:   { isActive: lot.isActive },
      after:    { isActive: false },
    })

    revalidatePath('/lots')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deactivateLot]', error)
    return { success: false, error: 'Erro ao desativar lote.' }
  }
}

// ─── Mover animal para lote ────────────────────────────────

/**
 * Move um animal para o lote especificado (ou remove do lote se targetLotId = null).
 *
 * Regras de domínio (via shared/domain):
 *   canMoveToLot()            → somente animais ativos
 *   shouldUpgradeToCowByLot() → HEIFER em lote LACTATING → COW automaticamente
 *
 * Nenhuma dessas regras está duplicada aqui — vêm do domínio compartilhado.
 * Prisma @updatedAt atualiza automaticamente o updatedAt do animal.
 */
export async function moveAnimalToLot(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = moveAnimalToLotSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Carrega animal para verificar guards
    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true, lotId: true, milkStatus: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }

    // Guard: somente animais ativos podem ser movimentados
    const moveGuard = canMoveToLot(animal)
    if (!moveGuard.allowed) {
      return { success: false, error: moveGuard.reason }
    }

    // Valida que o lote de destino pertence à fazenda (se informado)
    let targetLot: { type: string } | null = null
    if (parsed.data.targetLotId) {
      targetLot = await prisma.lot.findFirst({
        where:  { id: parsed.data.targetLotId, farmId, isActive: true },
        select: { type: true, id: true },
      })
      if (!targetLot) return { success: false, error: 'Lote de destino não encontrado ou inativo' }
    }

    // Resolve categoria final (HEIFER → COW se lote LACTATING)
    let newCategory = animal.category
    if (targetLot && shouldUpgradeToCowByLot(animal, targetLot)) {
      newCategory = 'COW'
    }

    // Resolve milkStatus automático baseado no tipo do lote de destino
    const farmSettings = await prisma.farmSettings.findUnique({
      where:  { farmId },
      select: { autoUpdateMilkStatus: true },
    })
    let newMilkStatus = animal.milkStatus
    if (farmSettings?.autoUpdateMilkStatus ?? true) {
      if (!parsed.data.targetLotId) {
        newMilkStatus = 'NA'
      } else if (targetLot?.type === 'LACTATING') {
        newMilkStatus = 'LACTATING'
      } else if (targetLot?.type === 'DRY' || targetLot?.type === 'MATERNITY') {
        newMilkStatus = 'DRY'
      } else if (targetLot?.type === 'HEIFER') {
        newMilkStatus = 'HEIFER'
      }
    }

    await prisma.animal.update({
      where: { id: parsed.data.animalId },
      data:  { lotId: parsed.data.targetLotId, category: newCategory, milkStatus: newMilkStatus },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: parsed.data.animalId,
      before:   { lotId: animal.lotId },
      after:    { lotId: parsed.data.targetLotId },
      metadata: {
        previousLotId: animal.lotId,
        targetLotId:   parsed.data.targetLotId,
        reason:        'manual_transfer',
        ...(newMilkStatus !== animal.milkStatus && {
          milkStatusBefore: animal.milkStatus,
          milkStatusAfter:  newMilkStatus,
        }),
      },
    })

    // Revalida lote de origem (se existia)
    if (animal.lotId) {
      revalidatePath(`/lots/${animal.lotId}`)
    }
    // Revalida lote de destino
    if (parsed.data.targetLotId) {
      revalidatePath(`/lots/${parsed.data.targetLotId}`)
    }

    revalidatePath('/lots')
    revalidatePath('/animals')
    revalidatePath(`/animals/${parsed.data.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[moveAnimalToLot]', error)
    return { success: false, error: 'Erro ao mover animal. Tente novamente.' }
  }
}

// ─── Remover animal do lote ────────────────────────────────

/**
 * Atalho semântico: remove o animal de qualquer lote.
 * Internamente chama moveAnimalToLot com targetLotId = null.
 */
export async function removeAnimalFromLot(
  animalId: string,
  farmId:   string,
): Promise<ActionResult<void>> {
  return moveAnimalToLot(farmId, { animalId, targetLotId: null })
}
