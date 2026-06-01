'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { auditLog }          from '@/lib/audit'
import { updateFarmSettingsSchema } from './schema'

type ActionResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

export async function updateFarmSettings(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const parsed = updateFarmSettingsSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const { mainProductionLotId, ...flags } = parsed.data

    // Valida que o lote pertence à fazenda (se informado)
    if (mainProductionLotId) {
      const lot = await prisma.lot.findFirst({
        where:  { id: mainProductionLotId, farmId, isActive: true },
        select: { id: true },
      })
      if (!lot) return { success: false, error: 'Lote não encontrado nesta fazenda' }
    }

    const before = await prisma.farmSettings.findUnique({ where: { farmId } })

    const settings = await prisma.farmSettings.upsert({
      where:  { farmId },
      create: { farmId, mainProductionLotId: mainProductionLotId ?? null, ...flags },
      update: {
        ...(mainProductionLotId !== undefined ? { mainProductionLotId } : {}),
        ...flags,
      },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'UPDATE',
      entity:   'FarmSettings',
      entityId: settings.id,
      before:   before ?? undefined,
      after:    settings,
    })

    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateFarmSettings]', error)
    return { success: false, error: 'Erro ao salvar configurações. Tente novamente.' }
  }
}
