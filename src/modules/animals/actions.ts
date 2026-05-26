'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { generateAnimalTag } from '@/lib/utils'

// Regras de domínio compartilhadas — NENHUMA regra de negócio é definida aqui
import {
  shouldUpgradeToCowByLot,
  canMoveToLot,
  canSendToSlaughter,
  canRegisterWeight,
  canUploadPhoto,
} from '@/modules/shared/domain/animal-rules'

import {
  createAnimalSchema,
  updateAnimalSchema,
  transferLotSchema,
  addPhotoSchema,
  addWeightSchema,
} from './schema'
import type { ActionResult } from './types'

// ─── Criar animal ──────────────────────────────────────────

export async function createAnimal(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = createAnimalSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const tag = await generateAnimalTag(farmId)

    // Determina a categoria final antes de inserir
    // Se entrar direto em lote LACTATING → já é vaca
    let category = parsed.data.category
    if (parsed.data.lotId && parsed.data.sex === 'FEMALE' && category === 'HEIFER') {
      const targetLot = await prisma.lot.findFirst({
        where:  { id: parsed.data.lotId, farmId },
        select: { type: true },
      })
      if (targetLot && shouldUpgradeToCowByLot({ sex: 'FEMALE', category: 'HEIFER' }, targetLot)) {
        category = 'COW'
      }
    }

    const animal = await prisma.animal.create({
      data: {
        ...parsed.data,
        farmId,
        tag,
        category,   // Usa categoria resolvida
        birthDate:    parsed.data.birthDate    ?? null,
        birthType:    parsed.data.birthType    ?? null,
        motherId:     parsed.data.motherId     ?? null,
        fatherId:     parsed.data.fatherId     ?? null,
        lotId:        parsed.data.lotId        ?? null,
        observations: parsed.data.observations ?? null,
      },
      select: { id: true },
    })

    revalidatePath('/animals')

    return { success: true, data: { id: animal.id } }
  } catch (error) {
    console.error('[createAnimal]', error)
    return { success: false, error: 'Erro ao cadastrar animal. Tente novamente.' }
  }
}

// ─── Editar animal ─────────────────────────────────────────

export async function updateAnimal(
  animalId: string,
  farmId:   string,
  rawData:  unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = updateAnimalSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const existing = await prisma.animal.findFirst({
      where:  { id: animalId, farmId },
      select: { id: true },
    })
    if (!existing) return { success: false, error: 'Animal não encontrado' }

    await prisma.animal.update({
      where: { id: animalId },
      data: {
        ...parsed.data,
        birthDate:    parsed.data.birthDate    ?? undefined,
        birthType:    parsed.data.birthType    ?? undefined,
        motherId:     parsed.data.motherId     ?? undefined,
        fatherId:     parsed.data.fatherId     ?? undefined,
        lotId:        parsed.data.lotId        ?? undefined,
        exitDate:     parsed.data.exitDate     ?? undefined,
        exitReason:   parsed.data.exitReason   ?? undefined,
        observations: parsed.data.observations ?? undefined,
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateAnimal]', error)
    return { success: false, error: 'Erro ao atualizar animal. Tente novamente.' }
  }
}

// ─── Transferir lote ───────────────────────────────────────

/**
 * Regra de negócio (via shared domain):
 *   canMoveToLot()          → somente animais ativos
 *   shouldUpgradeToCowByLot() → HEIFER em lote LACTATING → COW
 */
export async function transferAnimalToLot(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = transferLotSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }

    // Guard: somente animais ativos
    const moveGuard = canMoveToLot(animal)
    if (!moveGuard.allowed) {
      return { success: false, error: moveGuard.reason }
    }

    // Resolve categoria final com base no lote de destino
    let newCategory = animal.category
    if (parsed.data.lotId) {
      const targetLot = await prisma.lot.findFirst({
        where:  { id: parsed.data.lotId, farmId },
        select: { type: true },
      })
      if (targetLot && shouldUpgradeToCowByLot(animal, targetLot)) {
        newCategory = 'COW'
      }
    }

    await prisma.animal.update({
      where: { id: parsed.data.animalId },
      data:  { lotId: parsed.data.lotId, category: newCategory },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${parsed.data.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[transferAnimalToLot]', error)
    return { success: false, error: 'Erro ao transferir animal.' }
  }
}

// ─── Adicionar foto ────────────────────────────────────────

export async function addAnimalPhoto(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = addPhotoSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }

    // Guard (upload é sempre permitido, mas verificamos para consistência)
    const guard = canUploadPhoto(animal)
    if (!guard.allowed) return { success: false, error: guard.reason }

    // Operações atômicas: unset primary + count + create em uma transação
    const photo = await prisma.$transaction(async (tx) => {
      // Se for marcada como primária, desmarca as outras
      if (parsed.data.isPrimary) {
        await tx.animalPhoto.updateMany({
          where: { animalId: parsed.data.animalId },
          data:  { isPrimary: false },
        })
      }

      // Primeira foto é automaticamente primária
      const isFirst = (await tx.animalPhoto.count({
        where: { animalId: parsed.data.animalId },
      })) === 0

      return tx.animalPhoto.create({
        data: {
          animalId:  parsed.data.animalId,
          url:       parsed.data.url,
          caption:   parsed.data.caption ?? null,
          takenAt:   parsed.data.takenAt,
          isPrimary: isFirst || parsed.data.isPrimary,
        },
        select: { id: true },
      })
    })

    revalidatePath(`/animals/${parsed.data.animalId}`)

    return { success: true, data: { id: photo.id } }
  } catch (error) {
    console.error('[addAnimalPhoto]', error)
    return { success: false, error: 'Erro ao adicionar foto.' }
  }
}

// ─── Pesagem rápida ────────────────────────────────────────

export async function addWeightRecord(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = addWeightSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }

    const guard = canRegisterWeight(animal)
    if (!guard.allowed) return { success: false, error: guard.reason }

    await prisma.weightRecord.create({
      data: {
        animalId:   parsed.data.animalId,
        weightKg:   parsed.data.weightKg,
        measuredAt: parsed.data.measuredAt,
        notes:      parsed.data.notes ?? null,
      },
    })

    revalidatePath(`/animals/${parsed.data.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[addWeightRecord]', error)
    return { success: false, error: 'Erro ao registrar pesagem.' }
  }
}

// ─── Inativar animal ───────────────────────────────────────

/**
 * Regra de negócio (via shared domain):
 *   canSendToSlaughter() → fêmea IA não pode ir para abate antes de virar vaca
 */
export async function deactivateAnimal(
  animalId: string,
  farmId:   string,
  status:   'SOLD' | 'DEAD' | 'TRANSFERRED',
  reason?:  string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const animal = await prisma.animal.findFirst({
      where:  { id: animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true, lotId: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }

    // Guard: fêmea IA não pode ser abatida antes de virar vaca
    if (status === 'SOLD') {
      const guard = canSendToSlaughter(animal)
      if (!guard.allowed) {
        return { success: false, error: guard.reason }
      }
    }

    await prisma.animal.update({
      where: { id: animalId },
      data:  {
        status,
        exitDate:   new Date(),
        exitReason: reason ?? null,
        lotId:      null,   // Remove do lote ao sair
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${animalId}`)
    // Revalida página do lote de origem para atualizar contagem de animais
    if (animal.lotId) {
      revalidatePath('/lots')
      revalidatePath(`/lots/${animal.lotId}`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deactivateAnimal]', error)
    return { success: false, error: 'Erro ao inativar animal.' }
  }
}
