'use server'

import { revalidatePath }       from 'next/cache'
import { prisma }               from '@/lib/prisma'
import { auth }                 from '@/lib/auth'
import { requireFarmAccess }    from '@/lib/permissions'
import { auditLog, auditUpdate } from '@/lib/audit'
import {
  createHealthEventSchema,
  updateHealthEventSchema,
  bulkVaccinationSchema,
} from './schema'
import type { ActionResult } from './types'

// ─── Helpers ──────────────────────────────────────────────

function revalidateHealthPaths(animalId: string) {
  revalidatePath(`/animals/${animalId}`)
  revalidatePath('/health-events')
  revalidatePath('/')
}

// ─── Criar evento ─────────────────────────────────────────

export async function createHealthEvent(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = createHealthEventSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Valida que o animal pertence à fazenda
    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado' }

    const event = await prisma.healthEvent.create({
      data: {
        animalId:    parsed.data.animalId,
        type:        parsed.data.type,
        description: parsed.data.description,
        medication:  parsed.data.medication || null,
        cost:        parsed.data.cost        ?? null,
        occurredAt:  parsed.data.occurredAt,
        notes:       parsed.data.notes       || null,
        resolved:    parsed.data.resolved,
      },
      select: { id: true },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'HealthEvent',
      entityId: event.id,
      after:    {
        animalId: parsed.data.animalId,
        type:     parsed.data.type,
        description: parsed.data.description,
      },
    })

    revalidateHealthPaths(parsed.data.animalId)

    return { success: true, data: { id: event.id } }
  } catch (error) {
    console.error('[createHealthEvent]', error)
    return { success: false, error: 'Erro ao registrar evento. Tente novamente.' }
  }
}

// ─── Atualizar evento ─────────────────────────────────────

export async function updateHealthEvent(
  eventId:  string,
  farmId:   string,
  rawData:  unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = updateHealthEventSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.healthEvent.findFirst({
      where:  { id: eventId, animal: { farmId } },
      select: {
        id: true, animalId: true, type: true, description: true,
        medication: true, cost: true, occurredAt: true, resolved: true, notes: true,
      },
    })
    if (!existing) return { success: false, error: 'Evento não encontrado' }

    await prisma.healthEvent.update({
      where: { id: eventId },
      data:  {
        ...parsed.data,
        medication: parsed.data.medication || null,
        notes:      parsed.data.notes      || null,
      },
    })

    const { id: _id, animalId: _animalId, ...beforeFields } = existing
    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'UPDATE',
      entity:   'HealthEvent',
      entityId: eventId,
      before:   beforeFields,
      after:    parsed.data,
    })

    revalidateHealthPaths(existing.animalId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateHealthEvent]', error)
    return { success: false, error: 'Erro ao atualizar evento.' }
  }
}

// ─── Resolver evento ──────────────────────────────────────

export async function resolveHealthEvent(
  eventId: string,
  farmId:  string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const existing = await prisma.healthEvent.findFirst({
      where:  { id: eventId, animal: { farmId } },
      select: { id: true, animalId: true, resolved: true },
    })
    if (!existing) return { success: false, error: 'Evento não encontrado' }

    await prisma.healthEvent.update({
      where: { id: eventId },
      data:  { resolved: true },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'HealthEvent',
      entityId: eventId,
      before:   { resolved: existing.resolved },
      after:    { resolved: true },
    })

    revalidateHealthPaths(existing.animalId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[resolveHealthEvent]', error)
    return { success: false, error: 'Erro ao resolver evento.' }
  }
}

// ─── Vacinação em massa ────────────────────────────────────

export async function createBulkVaccination(
  farmId:    string,
  animalIds: string[],
  rawData:   unknown,
): Promise<ActionResult<{ count: number }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    if (!animalIds || animalIds.length === 0) {
      return { success: false, error: 'Selecione pelo menos um animal' }
    }

    const parsed = bulkVaccinationSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    // Valida que todos os animais pertencem à fazenda (IDOR)
    const validAnimals = await prisma.animal.findMany({
      where:  { id: { in: animalIds }, farmId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (validAnimals.length !== animalIds.length) {
      return { success: false, error: 'Um ou mais animais inválidos' }
    }

    const validIds = validAnimals.map((a) => a.id)

    const events = await prisma.$transaction(
      validIds.map((animalId) =>
        prisma.healthEvent.create({
          data: {
            animalId,
            type:        'VACCINATION',
            description: parsed.data.description,
            medication:  parsed.data.medication || null,
            cost:        parsed.data.cost       ?? null,
            occurredAt:  parsed.data.occurredAt,
            notes:       parsed.data.notes      || null,
            resolved:    true,
          },
          select: { id: true, animalId: true },
        }),
      ),
    )

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'HealthEvent',
      entityId: `bulk:${events.length}`,
      after: {
        type:        'VACCINATION',
        description: parsed.data.description,
        count:       events.length,
        animalIds:   validIds,
      },
      metadata: { source: 'bulk_vaccination' },
    })

    revalidatePath('/health-events')
    revalidatePath('/animals')
    revalidatePath('/')

    return { success: true, data: { count: events.length } }
  } catch (error) {
    console.error('[createBulkVaccination]', error)
    return { success: false, error: 'Erro ao registrar vacinações. Tente novamente.' }
  }
}

// ─── Excluir evento ───────────────────────────────────────

export async function deleteHealthEvent(
  eventId: string,
  farmId:  string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.healthEvent.findFirst({
      where:  { id: eventId, animal: { farmId } },
      select: { id: true, animalId: true, type: true },
    })
    if (!existing) return { success: false, error: 'Evento não encontrado' }

    await prisma.healthEvent.delete({ where: { id: eventId } })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'DELETE',
      entity:   'HealthEvent',
      entityId: eventId,
      before:   { animalId: existing.animalId, type: existing.type },
    })

    revalidateHealthPaths(existing.animalId)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteHealthEvent]', error)
    return { success: false, error: 'Erro ao excluir evento.' }
  }
}
