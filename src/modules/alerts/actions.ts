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
