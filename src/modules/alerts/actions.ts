'use server'

import { revalidatePath } from 'next/cache'
import { prisma }             from '@/lib/prisma'
import { auth }               from '@/lib/auth'
import { requireFarmAccess }  from '@/lib/permissions'
import { auditUpdate }        from '@/lib/audit'
import type { ActionResult }  from './types'

// ─── Resolver alerta ──────────────────────────────────────

export async function resolveAlert(
  alertId: string,
  farmId:  string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, farmId, status: 'PENDING' },
    })
    if (!alert) return { success: false, error: 'Alerta não encontrado ou já processado.' }

    await prisma.alert.update({
      where: { id: alertId },
      data:  { status: 'RESOLVED', resolvedAt: new Date() },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Alert',
      entityId: alertId,
      before:   { status: alert.status },
      after:    { status: 'RESOLVED' },
      metadata: { source: 'web', priority: alert.priority, alertType: alert.type },
    })

    revalidatePath('/alerts')
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[resolveAlert]', error)
    return { success: false, error: 'Erro ao resolver alerta.' }
  }
}

// ─── Registrar vacina pré-parto e resolver alerta ─────────

export async function applyVaccineAndResolveAlert(
  alertId:  string,
  animalId: string,
  farmId:   string,
  appliedAt: Date,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const [alert, animal] = await Promise.all([
      prisma.alert.findFirst({ where: { id: alertId, farmId, status: 'PENDING' } }),
      prisma.animal.findFirst({ where: { id: animalId, farmId } }),
    ])
    if (!alert)  return { success: false, error: 'Alerta não encontrado.' }
    if (!animal) return { success: false, error: 'Animal não encontrado.' }

    await prisma.$transaction([
      prisma.healthEvent.create({
        data: {
          animalId,
          type:        'VACCINATION',
          description: `${alert.title} — Rotavec J5 + Tifopasteurina / Providean Enteroplus`,
          occurredAt:  appliedAt,
          resolved:    true,
        },
      }),
      prisma.alert.update({
        where: { id: alertId },
        data:  { status: 'RESOLVED', resolvedAt: new Date() },
      }),
    ])

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Alert',
      entityId: alertId,
      before:   { status: 'PENDING' },
      after:    { status: 'RESOLVED' },
      metadata: { source: 'web', action: 'applyVaccine', animalId },
    })

    revalidatePath('/alerts')
    revalidatePath('/management/today')
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[applyVaccineAndResolveAlert]', error)
    return { success: false, error: 'Erro ao registrar vacina.' }
  }
}

// ─── Ignorar alerta ───────────────────────────────────────

export async function dismissAlert(
  alertId: string,
  farmId:  string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    const alert = await prisma.alert.findFirst({
      where: { id: alertId, farmId, status: 'PENDING' },
    })
    if (!alert) return { success: false, error: 'Alerta não encontrado ou já processado.' }

    await prisma.alert.update({
      where: { id: alertId },
      data:  { status: 'DISMISSED' },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Alert',
      entityId: alertId,
      before:   { status: alert.status },
      after:    { status: 'DISMISSED' },
      metadata: { source: 'web', priority: alert.priority, alertType: alert.type },
    })

    revalidatePath('/alerts')
    revalidatePath('/')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[dismissAlert]', error)
    return { success: false, error: 'Erro ao ignorar alerta.' }
  }
}
