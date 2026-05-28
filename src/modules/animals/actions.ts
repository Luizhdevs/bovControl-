'use server'

import { revalidatePath } from 'next/cache'
import { Prisma as PrismaTypes } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { generateAnimalTag } from '@/modules/animals/queries'
import { incrementStorageCounters, decrementStorageCounters } from '@/lib/storage-limits'
import { deleteFile } from '@/lib/storage/provider'

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
    for (let attempt = 0; attempt < 5; attempt++) {
      const tag = await generateAnimalTag(farmId)
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
