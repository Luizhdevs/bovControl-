'use server'

import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { canRegisterReproduction } from '@/modules/shared/domain/animal-guards'
import {
  reproductionSchema,
  updateReproductionStatusSchema,
} from './schema'
import type { ActionResult } from './types'

// ─── Helpers ───────────────────────────────────────────────

/**
 * Calcula a próxima data sugerida automaticamente quando não fornecida:
 * - INSEMINATION / NATURAL_MATING → +45 dias (diagnóstico de gestação)
 * - PREGNANCY_CHECK CONFIRMED    → +280 dias (previsão de parto)
 * - demais                        → null
 */
function calcNextCheckDate(
  type:   string,
  status: string,
  from:   Date,
): Date | null {
  if (type === 'INSEMINATION' || type === 'NATURAL_MATING') {
    return addDays(from, 45)
  }
  if (type === 'PREGNANCY_CHECK' && status === 'CONFIRMED') {
    return addDays(from, 280)
  }
  return null
}

/**
 * Cria alerta de PARTO PREVISTO no banco.
 * Chamado quando prenhez é CONFIRMADA.
 */
async function createCalvingAlert(
  farmId:   string,
  animalId: string,
  tag:      string,
  dueDate:  Date,
): Promise<void> {
  await prisma.alert.create({
    data: {
      farmId,
      animalId,
      type:        'CALVING',
      title:       `Parto previsto — ${tag}`,
      description: 'Prenhez confirmada. Prepare o local de parição.',
      priority:    'HIGH',
      status:      'PENDING',
      dueDate,
    },
  })
}

// ─── Registrar evento reprodutivo ──────────────────────────

/**
 * Cria um novo registro reprodutivo.
 *
 * Permissão mínima: WORKER
 * Guards: canRegisterReproduction (fêmea, ativa, não-bezerra)
 * Efeito colateral: se PREGNANCY_CHECK + CONFIRMED → cria alerta CALVING
 */
export async function registerReproduction(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = reproductionSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, tag: true, sex: true, category: true, status: true, birthType: true },
    })

    if (!animal) return { success: false, error: 'Animal não encontrado' }

    const guard = canRegisterReproduction(animal)
    if (!guard.allowed) return { success: false, error: guard.reason }

    const { animalId, type, date, status, bullName, nextCheckDate, result, notes } = parsed.data

    // Usa nextCheckDate informado ou calcula automaticamente
    const resolvedNextCheckDate =
      nextCheckDate ?? calcNextCheckDate(type, status, date)

    const record = await prisma.reproduction.create({
      data: {
        animalId,
        type,
        date,
        status,
        bullName:      bullName ?? null,
        nextCheckDate: resolvedNextCheckDate,
        result:        result ?? null,
        notes:         notes ?? null,
      },
      select: { id: true },
    })

    // Alerta automático de parto quando prenhez confirmada
    if (type === 'PREGNANCY_CHECK' && status === 'CONFIRMED') {
      const calvingDate = resolvedNextCheckDate ?? addDays(date, 280)
      await createCalvingAlert(farmId, animal.id, animal.tag, calvingDate)
    }

    revalidatePath('/reproduction')
    revalidatePath(`/reproduction/${animalId}`)
    revalidatePath(`/animals/${animalId}`)

    return { success: true, data: { id: record.id } }
  } catch (error) {
    console.error('[registerReproduction]', error)
    return { success: false, error: 'Erro ao registrar evento reprodutivo. Tente novamente.' }
  }
}

// ─── Atualizar status do registro ──────────────────────────

/**
 * Atualiza o status de um registro reprodutivo existente.
 *
 * Permissão mínima: MANAGER
 * Efeito colateral: se mudou para CONFIRMED e é PREGNANCY_CHECK → cria alerta CALVING
 */
export async function updateReproductionStatus(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = updateReproductionStatusSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.reproduction.findFirst({
      where:   { id: parsed.data.recordId, animal: { farmId } },
      select:  { id: true, type: true, status: true, date: true, animalId: true, animal: { select: { tag: true } } },
    })

    if (!existing) return { success: false, error: 'Registro não encontrado' }

    const resolvedNextCheckDate =
      parsed.data.nextCheckDate ??
      calcNextCheckDate(existing.type, parsed.data.status, existing.date)

    await prisma.reproduction.update({
      where: { id: parsed.data.recordId },
      data: {
        status:        parsed.data.status,
        nextCheckDate: resolvedNextCheckDate,
      },
    })

    // Cria alerta de parto se acabou de confirmar uma gestação
    const wasNotConfirmed  = existing.status !== 'CONFIRMED'
    const nowConfirmed     = parsed.data.status === 'CONFIRMED'
    const isPregnancyCheck = existing.type === 'PREGNANCY_CHECK'

    if (isPregnancyCheck && wasNotConfirmed && nowConfirmed) {
      const calvingDate = resolvedNextCheckDate ?? addDays(existing.date, 280)
      await createCalvingAlert(farmId, existing.animalId, existing.animal.tag, calvingDate)
    }

    revalidatePath('/reproduction')
    revalidatePath(`/reproduction/${existing.animalId}`)
    revalidatePath(`/animals/${existing.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateReproductionStatus]', error)
    return { success: false, error: 'Erro ao atualizar status. Tente novamente.' }
  }
}

// ─── Excluir registro ──────────────────────────────────────

/**
 * Remove um registro reprodutivo.
 *
 * Permissão mínima: MANAGER
 */
export async function deleteReproduction(
  recordId: string,
  farmId:   string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const record = await prisma.reproduction.findFirst({
      where:  { id: recordId, animal: { farmId } },
      select: { id: true, animalId: true },
    })
    if (!record) return { success: false, error: 'Registro não encontrado' }

    await prisma.reproduction.delete({ where: { id: recordId } })

    revalidatePath('/reproduction')
    revalidatePath(`/reproduction/${record.animalId}`)
    revalidatePath(`/animals/${record.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteReproduction]', error)
    return { success: false, error: 'Erro ao excluir registro.' }
  }
}
