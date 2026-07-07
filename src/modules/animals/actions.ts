'use server'

import { revalidatePath } from 'next/cache'
import { Prisma as PrismaTypes } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { generateAnimalTag } from '@/modules/animals/queries'
import { incrementStorageCounters, decrementStorageCounters } from '@/lib/storage-limits'
import { deleteFile } from '@/lib/storage/provider'
import { auditCreate, auditUpdate, auditDelete, auditDeactivate, auditLog } from '@/lib/audit'
import { getActiveFarm } from '@/lib/active-farm'

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
  markAnimalAsSoldSchema,
  markAnimalAsDeadSchema,
  markAnimalAsTransferredSchema,
  reactivateAnimalSchema,
  calvingSchema,
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

    // Retry em caso de race condition (dois cadastros simultâneos geram a mesma tag)
    let animal: { id: string } | null = null
    let tag = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      tag = await generateAnimalTag(farmId)
      try {
        animal = await prisma.animal.create({
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
        break   // sucesso — sai do loop
      } catch (e) {
        // P2002 = unique constraint violation — tag já usada (race condition)
        if (e instanceof PrismaTypes.PrismaClientKnownRequestError && e.code === 'P2002') {
          continue  // regenera tag e tenta novamente
        }
        throw e
      }
    }

    if (!animal) {
      return { success: false, error: 'Não foi possível gerar brinco único. Tente novamente.' }
    }

    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: animal.id,
      after: {
        tag,
        name:      parsed.data.name      ?? null,
        category,
        breed:     parsed.data.breed,
        sex:       parsed.data.sex,
        birthDate: parsed.data.birthDate ?? null,
        lotId:     parsed.data.lotId     ?? null,
      },
      metadata: { source: 'web' },
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
      select: {
        id: true, sex: true, category: true, purpose: true, status: true,
        name: true, breed: true, birthDate: true, birthType: true,
        motherId: true, fatherId: true, lotId: true,
        exitDate: true, exitReason: true, observations: true,
      },
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

    const { id: _id, ...beforeFields } = existing
    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: animalId,
      before:   beforeFields,
      after:    parsed.data,
      metadata: { source: 'web' },
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
      select: { id: true, sex: true, category: true, status: true, birthType: true, lotId: true },
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

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: parsed.data.animalId,
      before:   { lotId: animal.lotId },
      after:    { lotId: parsed.data.lotId },
      metadata: { previousLotId: animal.lotId, targetLotId: parsed.data.lotId },
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

    // Operações atômicas: unset primary + create + storage counter
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

      const created = await tx.animalPhoto.create({
        data: {
          animalId:     parsed.data.animalId,
          url:          parsed.data.url,
          thumbnailUrl: parsed.data.thumbnailUrl ?? null,
          caption:      parsed.data.caption ?? null,
          takenAt:      parsed.data.takenAt,
          isPrimary:    isFirst || parsed.data.isPrimary,
          sizeKb:       parsed.data.sizeKb,
        },
        select: { id: true },
      })

      // Incrementa contadores da fazenda dentro da mesma transação
      await incrementStorageCounters(tx, farmId, parsed.data.sizeKb)

      return created
    })

    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'AnimalPhoto',
      entityId: photo.id,
      metadata: {
        source:   'web',
        animalId: parsed.data.animalId,
        fileSize: parsed.data.sizeKb,
        fileName: parsed.data.url.split('/').pop() ?? parsed.data.url,
      },
    })

    revalidatePath(`/animals/${parsed.data.animalId}`)

    return { success: true, data: { id: photo.id } }
  } catch (error) {
    console.error('[addAnimalPhoto]', error)
    return { success: false, error: 'Erro ao adicionar foto.' }
  }
}

// ─── Remover foto ──────────────────────────────────────────

export async function deleteAnimalPhoto(
  photoId: string,
  farmId:  string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    // Busca a foto verificando que o animal pertence à fazenda (anti-IDOR)
    const photo = await prisma.animalPhoto.findFirst({
      where: {
        id:     photoId,
        animal: { farmId },
      },
      select: {
        id:          true,
        url:         true,
        thumbnailUrl: true,
        sizeKb:      true,
        animalId:    true,
        isPrimary:   true,
      },
    })
    if (!photo) return { success: false, error: 'Foto não encontrada' }

    await prisma.$transaction(async (tx) => {
      // Remove registro do banco
      await tx.animalPhoto.delete({ where: { id: photoId } })

      // Se era a foto primária, promove a mais recente das restantes
      if (photo.isPrimary) {
        const next = await tx.animalPhoto.findFirst({
          where:   { animalId: photo.animalId },
          orderBy: { takenAt: 'desc' },
          select:  { id: true },
        })
        if (next) {
          await tx.animalPhoto.update({
            where: { id: next.id },
            data:  { isPrimary: true },
          })
        }
      }

      // Decrementa contadores da fazenda
      await decrementStorageCounters(tx, farmId, photo.sizeKb)
    })

    // Remove arquivos do blob em paralelo (fora da transação — sem rollback necessário)
    await Promise.all([
      deleteFile(photo.url),
      photo.thumbnailUrl ? deleteFile(photo.thumbnailUrl) : Promise.resolve(),
    ])

    auditDelete({
      farmId,
      userId:   session.user.id,
      entity:   'AnimalPhoto',
      entityId: photoId,
      before:   { photoUrl: photo.url, animalId: photo.animalId },
    })

    revalidatePath(`/animals/${photo.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteAnimalPhoto]', error)
    return { success: false, error: 'Erro ao remover foto.' }
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

    const weightRecord = await prisma.weightRecord.create({
      data: {
        animalId:   parsed.data.animalId,
        weightKg:   parsed.data.weightKg,
        measuredAt: parsed.data.measuredAt,
        notes:      parsed.data.notes ?? null,
      },
      select: { id: true },
    })

    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'WeightRecord',
      entityId: weightRecord.id,
      after:    { weight: parsed.data.weightKg, recordedAt: parsed.data.measuredAt },
      metadata: { source: 'web' },
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

    auditDeactivate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: animalId,
      before:   { status: animal.status },
      after:    { status },
      metadata: { source: 'web' },
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

// ─── Registrar como Vendido ────────────────────────────────

export async function markAnimalAsSold(rawData: unknown): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = markAnimalAsSoldSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Fazenda não encontrada' }
    const { farmId } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true, tag: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }
    if (animal.status !== 'ACTIVE') return { success: false, error: 'Animal não está ativo' }

    const guard = canSendToSlaughter(animal)
    if (!guard.allowed) return { success: false, error: guard.reason }

    const exitReason = parsed.data.buyer
      ? `Vendido para: ${parsed.data.buyer}`
      : 'Vendido'

    await prisma.animal.update({
      where: { id: parsed.data.animalId },
      data:  { status: 'SOLD', exitDate: parsed.data.exitDate, exitReason },
    })

    auditDeactivate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: parsed.data.animalId,
      before:   { status: 'ACTIVE' },
      after:    { status: 'SOLD', exitDate: parsed.data.exitDate.toISOString() },
      metadata: {
        event:     'ANIMAL_MARKED_AS_SOLD',
        tag:       animal.tag,
        exitDate:  parsed.data.exitDate.toISOString(),
        saleValue: parsed.data.saleValue ?? null,
        buyer:     parsed.data.buyer ?? null,
        notes:     parsed.data.notes ?? null,
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/management/today')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[markAnimalAsSold]', error)
    return { success: false, error: 'Erro ao registrar venda. Tente novamente.' }
  }
}

// ─── Registrar Óbito ───────────────────────────────────────

export async function markAnimalAsDead(rawData: unknown): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = markAnimalAsDeadSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Fazenda não encontrada' }
    const { farmId } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, status: true, tag: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }
    if (animal.status !== 'ACTIVE') return { success: false, error: 'Animal não está ativo' }

    const exitReason = parsed.data.cause
      ? `Óbito: ${parsed.data.cause}`
      : 'Óbito registrado'

    await prisma.animal.update({
      where: { id: parsed.data.animalId },
      data:  { status: 'DEAD', exitDate: parsed.data.exitDate, exitReason },
    })

    auditDeactivate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: parsed.data.animalId,
      before:   { status: 'ACTIVE' },
      after:    { status: 'DEAD', exitDate: parsed.data.exitDate.toISOString() },
      metadata: {
        event:    'ANIMAL_MARKED_AS_DEAD',
        tag:      animal.tag,
        exitDate: parsed.data.exitDate.toISOString(),
        cause:    parsed.data.cause ?? null,
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/management/today')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[markAnimalAsDead]', error)
    return { success: false, error: 'Erro ao registrar óbito. Tente novamente.' }
  }
}

// ─── Registrar Transferência ───────────────────────────────

export async function markAnimalAsTransferred(rawData: unknown): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = markAnimalAsTransferredSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Fazenda não encontrada' }
    const { farmId } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, status: true, tag: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }
    if (animal.status !== 'ACTIVE') return { success: false, error: 'Animal não está ativo' }

    const exitReason = parsed.data.destination
      ? `Transferido para: ${parsed.data.destination}`
      : 'Transferido'

    await prisma.animal.update({
      where: { id: parsed.data.animalId },
      data:  { status: 'TRANSFERRED', exitDate: parsed.data.exitDate, exitReason },
    })

    auditDeactivate({
      farmId,
      userId:   session.user.id,
      entity:   'Animal',
      entityId: parsed.data.animalId,
      before:   { status: 'ACTIVE' },
      after:    { status: 'TRANSFERRED', exitDate: parsed.data.exitDate.toISOString() },
      metadata: {
        event:       'ANIMAL_MARKED_AS_TRANSFERRED',
        tag:         animal.tag,
        exitDate:    parsed.data.exitDate.toISOString(),
        destination: parsed.data.destination ?? null,
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/management/today')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[markAnimalAsTransferred]', error)
    return { success: false, error: 'Erro ao registrar transferência. Tente novamente.' }
  }
}

// ─── Reativar Animal ───────────────────────────────────────

export async function reactivateAnimal(rawData: unknown): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = reactivateAnimalSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Fazenda não encontrada' }
    const { farmId, role } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, status: true, tag: true, exitDate: true, exitReason: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }
    if (animal.status === 'ACTIVE') return { success: false, error: 'Animal já está ativo' }

    // Óbito: somente OWNER pode reativar
    if (animal.status === 'DEAD' && role !== 'OWNER') {
      return { success: false, error: 'Apenas o proprietário pode reativar animais com óbito registrado' }
    }

    const prevStatus     = animal.status
    const prevExitDate   = animal.exitDate
    const prevExitReason = animal.exitReason

    await prisma.animal.update({
      where: { id: parsed.data.animalId },
      data:  { status: 'ACTIVE', exitDate: null, exitReason: null },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'ACTIVATE',
      entity:   'Animal',
      entityId: parsed.data.animalId,
      before:   {
        status:     prevStatus,
        exitDate:   prevExitDate?.toISOString() ?? null,
        exitReason: prevExitReason,
      },
      after:    { status: 'ACTIVE', exitDate: null, exitReason: null },
      metadata: {
        event:          'ANIMAL_REACTIVATED',
        tag:            animal.tag,
        previousStatus: prevStatus,
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/management/today')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[reactivateAnimal]', error)
    return { success: false, error: 'Erro ao reativar animal. Tente novamente.' }
  }
}

// ─── Registrar Parto ───────────────────────────────────────

export async function registerCalving(
  rawData: unknown,
): Promise<{ success: boolean; error?: string; calveTag?: string }> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = calvingSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Fazenda não encontrada' }
    const { farmId } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const mother = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, tag: true, sex: true, category: true, status: true, breed: true, purpose: true, parityNumber: true },
    })

    if (!mother)               return { success: false, error: 'Animal não encontrado' }
    if (mother.sex !== 'FEMALE') return { success: false, error: 'Apenas fêmeas podem registrar parto' }
    if (mother.status !== 'ACTIVE') return { success: false, error: 'Animal não está ativo' }
    if (mother.category === 'CALF') return { success: false, error: 'Bezerras não podem registrar parto' }

    const { animalId, birthDate, calveSex, calveName } = parsed.data

    const result = await prisma.$transaction(async (tx) => {
      // Gera próximo brinco dentro da transaction (evita gap em escritas paralelas)
      const latest = await tx.animal.findFirst({
        where:   { farmId },
        select:  { tag: true },
        orderBy: { tag: 'desc' },
      })
      const maxNum  = latest ? (parseInt(latest.tag.match(/(\d+)$/)?.[1] ?? '0', 10) || 0) : 0
      const calveTag = `BOV-${String(maxNum + 1).padStart(4, '0')}`

      // Registro de parto na tabela de reprodução
      const reproRecord = await tx.reproduction.create({
        data: { animalId, type: 'CALVING', date: birthDate, status: 'CONFIRMED' },
        select: { id: true },
      })

      // Cria o bezerro
      const calf = await tx.animal.create({
        data: {
          farmId,
          tag:        calveTag,
          name:       calveName ?? null,
          sex:        calveSex,
          category:   'CALF',
          status:     'ACTIVE',
          breed:      mother.breed,
          purpose:    mother.purpose,
          milkStatus: 'NA',
          birthDate,
          motherId:   animalId,
        },
        select: { id: true, tag: true },
      })

      // Atualiza mãe: data do último parto + contador de partos
      await tx.animal.update({
        where: { id: animalId },
        data:  {
          lastCalvingDate: birthDate,
          parityNumber:    (mother.parityNumber ?? 0) + 1,
        },
      })

      // Encerra alertas de parto pendentes para esta mãe
      await tx.alert.updateMany({
        where: { animalId, farmId, type: 'CALVING', status: 'PENDING' },
        data:  { status: 'RESOLVED', resolvedAt: new Date() },
      })

      return { reproId: reproRecord.id, calveId: calf.id, calveTag: calf.tag }
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'Reproduction',
      entityId: result.reproId,
      after: { type: 'CALVING', animalId, birthDate, calveTag: result.calveTag },
      metadata: {
        event:     'CALVING_REGISTERED',
        motherTag: mother.tag,
        calveSex,
        calveName: calveName ?? null,
        calveTag:  result.calveTag,
        calveId:   result.calveId,
      },
    })

    revalidatePath('/animals')
    revalidatePath(`/animals/${animalId}`)
    revalidatePath('/management/today')
    revalidatePath('/reproduction')

    return { success: true, calveTag: result.calveTag }
  } catch (error) {
    console.error('[registerCalving]', error)
    return { success: false, error: 'Erro ao registrar parto. Tente novamente.' }
  }
}
