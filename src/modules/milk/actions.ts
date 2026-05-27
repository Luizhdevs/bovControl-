'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { auditLog }          from '@/lib/audit'
import { milkingSessionSchema, milkRecordSchema } from './schema'
import type { ActionResult } from './types'

// ─── Registrar/atualizar sessão de ordenha ─────────────────────

/**
 * UPSERT de uma sessão de ordenha (morning ou afternoon).
 * Permite corrigir dados do mesmo turno do mesmo dia reenviando a ação.
 *
 * Idempotência: se `idempotencyKey` for fornecido e já existir no banco,
 * retorna a sessão existente sem criar duplicata — garante sync offline seguro.
 */
export async function registerMilkingSession(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    const parsed = milkingSessionSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message, kind: 'domain' }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // ── Idempotência server-side ──────────────────────────────
    if (parsed.data.idempotencyKey) {
      const existing = await prisma.milkingSession.findUnique({
        where:  { idempotencyKey: parsed.data.idempotencyKey },
        select: { id: true },
      })
      if (existing) return { success: true, data: { id: existing.id } }
    }

    // Normaliza a data para meia-noite UTC (campo @db.Date)
    const date = new Date(parsed.data.date)
    date.setUTCHours(12, 0, 0, 0)   // Meio-dia UTC — evita ambiguidade de fuso

    // UPSERT: cria ou atualiza sessão do mesmo turno/dia
    const result = await prisma.milkingSession.upsert({
      where: {
        farmId_shift_date: {
          farmId,
          shift: parsed.data.shift,
          date,
        },
      },
      create: {
        farmId,
        shift:          parsed.data.shift,
        date,
        totalLiters:    parsed.data.totalLiters,
        milkingCows:    parsed.data.milkingCows,
        notes:          parsed.data.notes ?? null,
        idempotencyKey: parsed.data.idempotencyKey ?? null,
      },
      update: {
        totalLiters: parsed.data.totalLiters,
        milkingCows: parsed.data.milkingCows,
        notes:       parsed.data.notes ?? null,
      },
      select: { id: true },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'MilkingSession',
      entityId: result.id,
      after: {
        shift:       parsed.data.shift,
        totalLiters: parsed.data.totalLiters,
        milkingCows: parsed.data.milkingCows,
      },
    })

    revalidatePath('/milk')
    revalidatePath('/')

    return { success: true, data: { id: result.id } }
  } catch (error) {
    console.error('[registerMilkingSession]', error)
    return { success: false, error: 'Erro ao registrar ordenha. Tente novamente.', kind: 'network' }
  }
}

// ─── Excluir sessão de ordenha ─────────────────────────────────

export async function deleteMilkingSession(
  sessionId: string,
  farmId:    string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.milkingSession.findFirst({
      where:  { id: sessionId, farmId },
      select: { id: true, shift: true, totalLiters: true, milkingCows: true },
    })
    if (!existing) return { success: false, error: 'Sessão não encontrada', kind: 'domain' }

    await prisma.milkingSession.delete({ where: { id: sessionId } })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'DELETE',
      entity:   'MilkingSession',
      entityId: sessionId,
      before:   {
        shift:       existing.shift,
        totalLiters: existing.totalLiters,
        milkingCows: existing.milkingCows,
      },
    })

    revalidatePath('/milk')
    revalidatePath('/')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteMilkingSession]', error)
    return { success: false, error: 'Erro ao excluir sessão.', kind: 'network' }
  }
}

// ─── Registrar produção individual (legado / Fase 2) ──────────
// Mantido para rastreabilidade por animal (futuro) e /milk/[animalId].

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

    // Idempotência server-side
    if (parsed.data.idempotencyKey) {
      const existing = await prisma.milkRecord.findUnique({
        where:  { idempotencyKey: parsed.data.idempotencyKey },
        select: { id: true },
      })
      if (existing) return { success: true, data: { id: existing.id } }
    }

    const animal = await prisma.animal.findFirst({
      where:  { id: parsed.data.animalId, farmId },
      select: { id: true },
    })
    if (!animal) return { success: false, error: 'Animal não encontrado', kind: 'domain' }

    const record = await prisma.milkRecord.create({
      data: {
        animalId:       parsed.data.animalId,
        farmId,
        liters:         parsed.data.liters,
        shift:          parsed.data.shift,
        recordedAt:     parsed.data.recordedAt,
        idempotencyKey: parsed.data.idempotencyKey ?? undefined,
      },
      select: { id: true },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'CREATE',
      entity:   'MilkRecord',
      entityId: record.id,
      after:    { animalId: parsed.data.animalId, liters: parsed.data.liters, shift: parsed.data.shift },
    })

    revalidatePath(`/animals/${parsed.data.animalId}`)
    revalidatePath('/milk')

    return { success: true, data: { id: record.id } }
  } catch (error) {
    console.error('[registerMilkRecord]', error)
    return { success: false, error: 'Erro ao registrar produção. Tente novamente.', kind: 'network' }
  }
}

// ─── Excluir registro individual (legado / Fase 2) ────────────

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
      select: { id: true, animalId: true, liters: true, shift: true },
    })
    if (!record) return { success: false, error: 'Registro não encontrado', kind: 'domain' }

    await prisma.milkRecord.delete({ where: { id: recordId } })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'DELETE',
      entity:   'MilkRecord',
      entityId: recordId,
      before:   { animalId: record.animalId, liters: record.liters, shift: record.shift },
    })

    revalidatePath(`/animals/${record.animalId}`)
    revalidatePath('/milk')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteMilkRecord]', error)
    return { success: false, error: 'Erro ao excluir registro.', kind: 'network' }
  }
}
