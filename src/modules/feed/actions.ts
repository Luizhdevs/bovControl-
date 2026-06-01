'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { auditLog }          from '@/lib/audit'
import { feedSessionSchema, feedTypeSchema } from './schema'
import type { ActionResult } from './types'

// ─── Registrar sessão de alimentação ──────────────────────────

export async function registerFeedSession(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string; animalCount: number }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    const parsed = feedSessionSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message, kind: 'domain' }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Valida feedType (ativo + pertence à fazenda) e lote em paralelo
    const [feedType, lot] = await Promise.all([
      prisma.feedType.findFirst({
        where:  { id: parsed.data.feedTypeId, farmId, active: true },
        select: { id: true, weightPerBagKg: true, pricePerBag: true },
      }),
      prisma.lot.findFirst({
        where:  { id: parsed.data.lotId, farmId, isActive: true },
        select: { id: true, name: true },
      }),
    ])

    if (!feedType) {
      return { success: false, error: 'Tipo de ração não encontrado ou inativo', kind: 'domain' }
    }
    if (!lot) {
      return { success: false, error: 'Lote não encontrado', kind: 'domain' }
    }

    // Busca animais ACTIVE do lote
    const activeAnimals = await prisma.animal.findMany({
      where:  { lotId: parsed.data.lotId, farmId, status: 'ACTIVE' },
      select: { id: true },
    })

    if (activeAnimals.length === 0) {
      return {
        success: false,
        error:   'Lote sem animais ativos. Adicione animais ao lote antes de registrar alimentação.',
        kind:    'domain',
      }
    }

    const animalCount            = activeAnimals.length
    const totalWeightKg          = parsed.data.bagCount * feedType.weightPerBagKg
    const totalCost              = parsed.data.bagCount * feedType.pricePerBag
    const consumedKgPerAnimal    = totalWeightKg / animalCount
    const estimatedCostPerAnimal = totalCost     / animalCount

    const date = new Date(parsed.data.date)
    date.setUTCHours(12, 0, 0, 0)

    const startTime = Date.now()

    const result = await prisma.$transaction(async (tx) => {
      const feedSession = await tx.feedSession.create({
        data: {
          farmId,
          lotId:               parsed.data.lotId,
          feedTypeId:          parsed.data.feedTypeId,
          date,
          bagCount:            parsed.data.bagCount,
          totalWeightKg,
          totalCost,
          animalCount,
          averageKgPerAnimal:   consumedKgPerAnimal,
          averageCostPerAnimal: estimatedCostPerAnimal,
          notes:               parsed.data.notes || null,
          createdById:         session.user.id,
        },
        select: { id: true },
      })

      await tx.animalFeedConsumption.createMany({
        data: activeAnimals.map((a) => ({
          animalId:      a.id,
          feedSessionId: feedSession.id,
          consumedKg:    consumedKgPerAnimal,
          estimatedCost: estimatedCostPerAnimal,
        })),
      })

      await tx.animal.updateMany({
        where: { id: { in: activeAnimals.map((a) => a.id) } },
        data: {
          totalFeedConsumedKg: { increment: consumedKgPerAnimal    },
          estimatedFeedCost:   { increment: estimatedCostPerAnimal },
        },
      })

      return feedSession
    })

    const txMs = Date.now() - startTime
    console.log(
      `[registerFeedSession] farmId=${farmId} lot=${lot.name} animals=${animalCount}` +
      ` totalKg=${totalWeightKg.toFixed(1)} totalCost=R$${totalCost.toFixed(2)} txMs=${txMs}`,
    )

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'FeedSession',
      entityId: result.id,
      after: {
        lotId:        parsed.data.lotId,
        feedTypeId:   parsed.data.feedTypeId,
        bagCount:     parsed.data.bagCount,
        totalWeightKg,
        totalCost,
        animalCount,
      },
      metadata: { source: 'web' },
    })

    revalidatePath('/feed')
    revalidatePath('/')

    return { success: true, data: { id: result.id, animalCount } }
  } catch (error) {
    console.error('[registerFeedSession]', error)
    return { success: false, error: 'Erro ao registrar alimentação. Tente novamente.', kind: 'network' }
  }
}

// ─── Excluir sessão de alimentação ────────────────────────────

export async function deleteFeedSession(
  sessionId: string,
  farmId:    string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    await requireFarmAccess(session.user.id, farmId, 'OWNER')

    const feedSession = await prisma.feedSession.findFirst({
      where:  { id: sessionId, farmId },
      select: {
        id:                   true,
        lotId:                true,
        totalWeightKg:        true,
        totalCost:            true,
        animalCount:          true,
        averageKgPerAnimal:   true,
        averageCostPerAnimal: true,
        consumptions:         { select: { animalId: true } },
      },
    })
    if (!feedSession) {
      return { success: false, error: 'Sessão de alimentação não encontrada', kind: 'domain' }
    }

    const animalIds = feedSession.consumptions.map((c) => c.animalId)

    await prisma.$transaction(async (tx) => {
      if (animalIds.length > 0) {
        await tx.animal.updateMany({
          where: { id: { in: animalIds } },
          data: {
            totalFeedConsumedKg: { decrement: feedSession.averageKgPerAnimal   },
            estimatedFeedCost:   { decrement: feedSession.averageCostPerAnimal },
          },
        })
      }
      // Cascade deleta AnimalFeedConsumption
      await tx.feedSession.delete({ where: { id: sessionId } })
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'DELETE',
      entity:   'FeedSession',
      entityId: sessionId,
      before: {
        lotId:         feedSession.lotId,
        animalCount:   feedSession.animalCount,
        totalWeightKg: feedSession.totalWeightKg,
        totalCost:     feedSession.totalCost,
      },
    })

    revalidatePath('/feed')
    revalidatePath('/')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteFeedSession]', error)
    return { success: false, error: 'Erro ao excluir sessão. Tente novamente.', kind: 'network' }
  }
}

// ─── Criar tipo de ração ───────────────────────────────────────

export async function createFeedType(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    const parsed = feedTypeSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message, kind: 'domain' }
    }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const feedType = await prisma.feedType.create({
      data: {
        farmId,
        name:           parsed.data.name,
        brand:          parsed.data.brand || null,
        weightPerBagKg: parsed.data.weightPerBagKg,
        pricePerBag:    parsed.data.pricePerBag,
        proteinPercent: parsed.data.proteinPercent ?? null,
        active:         parsed.data.active,
      },
      select: { id: true },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'FeedType',
      entityId: feedType.id,
      after:    parsed.data,
    })

    revalidatePath('/feed-types')

    return { success: true, data: { id: feedType.id } }
  } catch (error) {
    console.error('[createFeedType]', error)
    return { success: false, error: 'Erro ao criar tipo de ração.', kind: 'network' }
  }
}

// ─── Atualizar tipo de ração ───────────────────────────────────

export async function updateFeedType(
  feedTypeId: string,
  farmId:     string,
  rawData:    unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    const parsed = feedTypeSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message, kind: 'domain' }
    }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.feedType.findFirst({
      where:  { id: feedTypeId, farmId },
      select: { id: true, name: true, brand: true, weightPerBagKg: true, pricePerBag: true, proteinPercent: true, active: true },
    })
    if (!existing) {
      return { success: false, error: 'Tipo de ração não encontrado', kind: 'domain' }
    }

    await prisma.feedType.update({
      where: { id: feedTypeId },
      data: {
        name:           parsed.data.name,
        brand:          parsed.data.brand || null,
        weightPerBagKg: parsed.data.weightPerBagKg,
        pricePerBag:    parsed.data.pricePerBag,
        proteinPercent: parsed.data.proteinPercent ?? null,
        active:         parsed.data.active,
      },
    })

    const { id: _id, ...beforeFields } = existing
    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'UPDATE',
      entity:   'FeedType',
      entityId: feedTypeId,
      before:   beforeFields,
      after:    parsed.data,
    })

    revalidatePath('/feed-types')

    return { success: true, data: { id: feedTypeId } }
  } catch (error) {
    console.error('[updateFeedType]', error)
    return { success: false, error: 'Erro ao atualizar tipo de ração.', kind: 'network' }
  }
}

// ─── Ativar/desativar tipo de ração ───────────────────────────

export async function toggleFeedTypeActive(
  feedTypeId: string,
  farmId:     string,
): Promise<ActionResult<{ active: boolean }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.feedType.findFirst({
      where:  { id: feedTypeId, farmId },
      select: { id: true, active: true },
    })
    if (!existing) {
      return { success: false, error: 'Tipo de ração não encontrado', kind: 'domain' }
    }

    const updated = await prisma.feedType.update({
      where:  { id: feedTypeId },
      data:   { active: !existing.active },
      select: { active: true },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'UPDATE',
      entity:   'FeedType',
      entityId: feedTypeId,
      before:   { active: existing.active },
      after:    { active: updated.active },
    })

    revalidatePath('/feed-types')

    return { success: true, data: { active: updated.active } }
  } catch (error) {
    console.error('[toggleFeedTypeActive]', error)
    return { success: false, error: 'Erro ao alterar status da ração.', kind: 'network' }
  }
}
