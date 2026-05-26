'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import {
  canRegisterMilk,
  shouldUpgradeToCowByMilkRecord,
} from '@/modules/shared/domain/animal-rules'
import { milkRecordSchema } from './schema'
import type { ActionResult } from './types'

// ─── Registrar produção de leite ───────────────────────────

/**
 * Registra a produção de leite de um animal.
 *
 * Integração com shared domain:
 * 1. canRegisterMilk() — guarda: macho, inativo, bezerra bloqueados
 * 2. shouldUpgradeToCowByMilkRecord() — novilha com leite vira vaca
 *
 * Operações de DB em $transaction para garantir atomicidade:
 * - create MilkRecord + update Animal.category são indivisíveis.
 */
export async function registerMilkRecord(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    const parsed = milkRecordSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message, kind: 'domain' }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Carrega animal para aplicar guards
    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true },
    })

    if (!animal) return { success: false, error: 'Animal não encontrado', kind: 'domain' }

    // Guard: valida se pode registrar leite
    const guard = canRegisterMilk(animal)
    if (!guard.allowed) {
      return { success: false, error: guard.reason, kind: 'domain' }
    }

    const needsUpgrade = shouldUpgradeToCowByMilkRecord(animal)

    // Cria o registro + possível upgrade de categoria em uma transação atômica
    const record = await prisma.$transaction(async (tx) => {
      const created = await tx.milkRecord.create({
        data: {
          animalId:   parsed.data.animalId,
          farmId,
          liters:     parsed.data.liters,
          shift:      parsed.data.shift,
          recordedAt: parsed.data.recordedAt,
        },
        select: { id: true },
      })

      // Regra automática: HEIFER com registro de leite vira COW
      if (needsUpgrade) {
        await tx.animal.update({
          where: { id: animal.id },
          data:  { category: 'COW' },
        })
      }

      return created
    })

    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/milk')
    revalidatePath('/')

    return { success: true, data: { id: record.id } }
  } catch (error) {
    console.error('[registerMilkRecord]', error)
    return { success: false, error: 'Erro ao registrar produção. Tente novamente.', kind: 'network' }
  }
}

// ─── Excluir registro ──────────────────────────────────────

export async function deleteMilkRecord(
  recordId: string,
  farmId:   string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const record = await prisma.milkRecord.findFirst({
      where:  { id: recordId, farmId },
      select: { id: true, animalId: true },
    })
    if (!record) return { success: false, error: 'Registro não encontrado', kind: 'domain' }

    await prisma.milkRecord.delete({ where: { id: recordId } })

    revalidatePath(`/animals/${record.animalId}`)
    revalidatePath('/milk')
    revalidatePath('/')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteMilkRecord]', error)
    return { success: false, error: 'Erro ao excluir registro.', kind: 'network' }
  }
}
