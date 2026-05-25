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
 * Nenhuma dessas regras está duplicada aqui — vêm do domínio compartilhado.
 */
export async function registerMilkRecord(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    const parsed = milkRecordSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Carrega animal para aplicar guards
    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true, sex: true, category: true, status: true, birthType: true },
    })

    if (!animal) return { success: false, error: 'Animal não encontrado' }

    // Guard: valida se pode registrar leite
    const guard = canRegisterMilk(animal)
    if (!guard.allowed) {
      return { success: false, error: guard.reason }
    }

    // Cria o registro de leite
    const record = await prisma.milkRecord.create({
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
    // Usa a função do domínio compartilhado para decidir
    if (shouldUpgradeToCowByMilkRecord(animal)) {
      await prisma.animal.update({
        where: { id: animal.id },
        data:  { category: 'COW' },
      })
    }

    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/milk')

    return { success: true, data: { id: record.id } }
  } catch (error) {
    console.error('[registerMilkRecord]', error)
    return { success: false, error: 'Erro ao registrar produção. Tente novamente.' }
  }
}

// ─── Excluir registro ──────────────────────────────────────

export async function deleteMilkRecord(
  recordId: string,
  farmId:   string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const record = await prisma.milkRecord.findFirst({
      where:  { id: recordId, farmId },
      select: { id: true, animalId: true },
    })
    if (!record) return { success: false, error: 'Registro não encontrado' }

    await prisma.milkRecord.delete({ where: { id: recordId } })

    revalidatePath(`/animals/${record.animalId}`)
    revalidatePath('/milk')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteMilkRecord]', error)
    return { success: false, error: 'Erro ao excluir registro.' }
  }
}
