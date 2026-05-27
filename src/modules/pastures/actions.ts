'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { createPastureSchema, updatePastureSchema } from './schema'
import type { ActionResult } from './types'

// ─── Criar pasto ──────────────────────────────────────────

export async function createPasture(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const parsed = createPastureSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    // Nome único por fazenda
    const existing = await prisma.pasture.findFirst({
      where: { farmId, name: { equals: parsed.data.name, mode: 'insensitive' } },
    })
    if (existing) {
      return { success: false, error: 'Já existe um pasto com este nome nesta fazenda.' }
    }

    const pasture = await prisma.pasture.create({
      data: { farmId, ...parsed.data },
      select: { id: true },
    })

    revalidatePath('/pastures')
    return { success: true, data: { id: pasture.id } }
  } catch (error) {
    console.error('[createPasture]', error)
    return { success: false, error: 'Erro ao criar pasto. Tente novamente.' }
  }
}

// ─── Atualizar pasto ──────────────────────────────────────

export async function updatePasture(
  id:      string,
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const parsed = updatePastureSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const pasture = await prisma.pasture.findFirst({ where: { id, farmId } })
    if (!pasture) return { success: false, error: 'Pasto não encontrado.' }

    // Verifica nome duplicado (se mudou)
    if (parsed.data.name && parsed.data.name !== pasture.name) {
      const nameConflict = await prisma.pasture.findFirst({
        where: { farmId, name: { equals: parsed.data.name, mode: 'insensitive' }, NOT: { id } },
      })
      if (nameConflict) {
        return { success: false, error: 'Já existe um pasto com este nome nesta fazenda.' }
      }
    }

    await prisma.pasture.update({
      where: { id },
      data:  parsed.data,
    })

    revalidatePath('/pastures')
    revalidatePath(`/pastures/${id}/edit`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updatePasture]', error)
    return { success: false, error: 'Erro ao atualizar pasto. Tente novamente.' }
  }
}

// ─── Desativar pasto ──────────────────────────────────────

/**
 * Soft delete — marca isActive = false.
 * Protegido: não pode desativar se houver lotes ativos usando este pasto.
 */
export async function deactivatePasture(
  id:     string,
  farmId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const pasture = await prisma.pasture.findFirst({
      where:  { id, farmId },
      select: {
        id:       true,
        isActive: true,
        _count:   { select: { lots: { where: { isActive: true } } } },
      },
    })
    if (!pasture)          return { success: false, error: 'Pasto não encontrado.' }
    if (!pasture.isActive) return { success: false, error: 'Pasto já está inativo.' }

    // Proteção: não pode desativar se tem lotes ativos vinculados
    if (pasture._count.lots > 0) {
      return {
        success: false,
        error:   `Este pasto possui ${pasture._count.lots} lote(s) ativo(s). Remova ou mova os lotes antes de desativar.`,
      }
    }

    await prisma.pasture.update({
      where: { id },
      data:  { isActive: false },
    })

    revalidatePath('/pastures')
    revalidatePath('/lots')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deactivatePasture]', error)
    return { success: false, error: 'Erro ao desativar pasto.' }
  }
}

// ─── Reativar pasto ───────────────────────────────────────

export async function reactivatePasture(
  id:     string,
  farmId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const pasture = await prisma.pasture.findFirst({ where: { id, farmId } })
    if (!pasture) return { success: false, error: 'Pasto não encontrado.' }

    await prisma.pasture.update({ where: { id }, data: { isActive: true } })

    revalidatePath('/pastures')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[reactivatePasture]', error)
    return { success: false, error: 'Erro ao reativar pasto.' }
  }
}
