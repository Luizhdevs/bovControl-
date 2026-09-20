'use server'

import { revalidatePath } from 'next/cache'
import { prisma }          from '@/lib/prisma'
import { auth }            from '@/lib/auth'
import { getActiveFarm }   from '@/lib/active-farm'
import { requireFarmAccess } from '@/lib/permissions'
import { auditUpdate }     from '@/lib/audit'
import type { ActionResult } from './types'

export type DGStage = 'DG_P30' | 'DG_P60'

export async function updateDGResult(
  reproductionId: string,
  dgStage:   DGStage,
  newStatus: 'CONFIRMED' | 'FAILED',
  observation?: string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Fazenda não encontrada' }

    const farmId = activeFarm.farmId

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const reproduction = await prisma.reproduction.findFirst({
      where: {
        id:    reproductionId,
        type:  'INSEMINATION',
        bullName: { startsWith: 'TE:' },
        animal: { farmId },
      },
      select: { id: true, status: true, result: true, animalId: true, notes: true },
    })

    if (!reproduction) {
      return { success: false, error: 'Registro TE não encontrado' }
    }

    const before = { status: reproduction.status, result: reproduction.result }

    // DG P30 confirmada → nextCheckDate aponta para DG P60 (meados de nov)
    const nextCheckDate =
      dgStage === 'DG_P30' && newStatus === 'CONFIRMED'
        ? new Date('2026-11-14T12:00:00.000Z')
        : undefined

    const resultText = observation
      ? `${dgStage}: ${newStatus} — ${observation}`
      : `${dgStage}: ${newStatus}`

    await prisma.reproduction.update({
      where: { id: reproductionId },
      data: {
        status:        newStatus,
        result:        resultText,
        ...(nextCheckDate ? { nextCheckDate } : {}),
      },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'Reproduction',
      entityId: reproductionId,
      before,
      after:  { status: newStatus, result: resultText, dgStage },
      metadata: { source: 'web', event: 'TE_DG_UPDATE', dgStage },
    })

    revalidatePath('/reproduction/protocolos/te')
    revalidatePath(`/reproduction/${reproduction.animalId}`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateDGResult]', error)
    return { success: false, error: 'Erro ao registrar resultado. Tente novamente.' }
  }
}
