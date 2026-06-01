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

    // Verifica se já existe sessão para determinar action correta no audit
    const existingSession = await prisma.milkingSession.findFirst({
      where:  { farmId, shift: parsed.data.shift, date },
      select: { id: true, totalLiters: true, milkingCows: true },
    })

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
      action:   existingSession ? 'UPDATE' : 'CREATE',
      entity:   'MilkingSession',
      entityId: result.id,
      ...(existingSession && {
        before: {
          totalLiters: existingSession.totalLiters,
          milkingCows: existingSession.milkingCows,
        },
      }),
      after: {
        shift:       parsed.data.shift,
        totalLiters: parsed.data.totalLiters,
        milkingCows: parsed.data.milkingCows,
      },
      metadata: { source: 'web' },
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

// ─── Registrar sessão + participantes em transaction única ────

/**
 * Registra (ou atualiza) a sessão de ordenha e grava os participantes
 * em uma única $transaction — garante consistência e idempotência offline.
 *
 * Se participants for undefined, grava só a sessão (compatibilidade).
 * Se participants for [], remove todos os participantes anteriores.
 */
export async function registerMilkingSessionWithParticipants(
  farmId:               string,
  rawData:              unknown,
  participantAnimalIds?: string[],
  source:               'web' | 'sync' = 'web',
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    const parsed = milkingSessionSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message, kind: 'domain' }
    }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Idempotência: se a sessão já existe pelo key, retorna sem duplicar
    if (parsed.data.idempotencyKey) {
      const existingByKey = await prisma.milkingSession.findUnique({
        where:  { idempotencyKey: parsed.data.idempotencyKey },
        select: { id: true },
      })
      if (existingByKey) return { success: true, data: { id: existingByKey.id } }
    }

    // Normaliza data para meio-dia UTC (evita offset de fuso)
    const rawDate    = parsed.data.date
    const normalDate = new Date(
      Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate(), 12, 0, 0),
    )

    const litersPerCow = participantAnimalIds && participantAnimalIds.length > 0
      ? Math.round((parsed.data.totalLiters / participantAnimalIds.length) * 10) / 10
      : null

    // Garante que milkingCows reflete os participantes reais (se fornecidos)
    const milkingCows = participantAnimalIds !== undefined
      ? participantAnimalIds.length
      : parsed.data.milkingCows

    // Verifica se já existe sessão para determinar action correta no audit
    const existingSessionWP = await prisma.milkingSession.findFirst({
      where:  { farmId, shift: parsed.data.shift, date: normalDate },
      select: { id: true, totalLiters: true, milkingCows: true },
    })

    const milkSession = await prisma.$transaction(async (tx) => {
      const s = await tx.milkingSession.upsert({
        where:  { farmId_shift_date: { farmId, shift: parsed.data.shift, date: normalDate } },
        create: {
          farmId,
          shift:          parsed.data.shift,
          date:           normalDate,
          totalLiters:    parsed.data.totalLiters,
          milkingCows,
          notes:          parsed.data.notes ?? null,
          idempotencyKey: parsed.data.idempotencyKey ?? null,
        },
        update: {
          totalLiters: parsed.data.totalLiters,
          milkingCows,
          notes:       parsed.data.notes ?? null,
        },
        select: { id: true },
      })

      if (participantAnimalIds !== undefined) {
        // Remove participantes não incluídos nesta atualização
        await tx.milkingSessionParticipant.deleteMany({
          where: {
            sessionId: s.id,
            ...(participantAnimalIds.length > 0
              ? { animalId: { notIn: participantAnimalIds } }
              : {}),
          },
        })

        // Upsert participantes novos
        if (participantAnimalIds.length > 0 && litersPerCow !== null) {
          await tx.milkingSessionParticipant.createMany({
            data: participantAnimalIds.map((animalId) => ({
              sessionId:   s.id,
              animalId,
              liters:      litersPerCow,
              isEstimated: true,
            })),
            skipDuplicates: true,
          })
          // Atualiza litros de participantes que já existiam (valor pode ter mudado)
          await tx.milkingSessionParticipant.updateMany({
            where: { sessionId: s.id },
            data:  { liters: litersPerCow, isEstimated: true },
          })
        }
      }

      return s
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   existingSessionWP ? 'UPDATE' : 'CREATE',
      entity:   'MilkingSession',
      entityId: milkSession.id,
      ...(existingSessionWP && {
        before: {
          totalLiters: existingSessionWP.totalLiters,
          milkingCows: existingSessionWP.milkingCows,
        },
      }),
      after: {
        shift:        parsed.data.shift,
        totalLiters:  parsed.data.totalLiters,
        milkingCows,
        participants: participantAnimalIds?.length ?? 0,
      },
      metadata: { source },
    })

    revalidatePath('/milk')
    revalidatePath('/')

    return { success: true, data: { id: milkSession.id } }
  } catch (error) {
    console.error('[registerMilkingSessionWithParticipants]', error)
    return { success: false, error: 'Erro ao registrar ordenha.', kind: 'network' }
  }
}

// ─── Registrar participantes de uma sessão ────────────────────

export type ParticipantInput = {
  animalId:      string
  liters?:       number
  idempotencyKey?: string
}

/**
 * Grava os participantes de uma sessão de ordenha.
 * Para cada animalId, calcula liters = totalLiters / count(participantes).
 * Idempotente: já existindo, faz upsert silencioso.
 */
export async function registerSessionParticipants(
  sessionId:    string,
  farmId:       string,
  animalIds:    string[],
  totalLiters:  number,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado', kind: 'domain' }

    await requireFarmAccess(session.user.id, farmId, 'WORKER')

    // Valida que a sessão pertence à fazenda
    const milkSession = await prisma.milkingSession.findFirst({
      where:  { id: sessionId, farmId },
      select: { id: true },
    })
    if (!milkSession) return { success: false, error: 'Sessão não encontrada', kind: 'domain' }

    if (animalIds.length === 0) {
      // Remove todos os participantes da sessão
      await prisma.milkingSessionParticipant.deleteMany({ where: { sessionId } })
      return { success: true, data: undefined }
    }

    const litersPerCow = totalLiters / animalIds.length

    await prisma.$transaction(
      animalIds.map((animalId) =>
        prisma.milkingSessionParticipant.upsert({
          where:  { sessionId_animalId: { sessionId, animalId } },
          create: { sessionId, animalId, liters: litersPerCow, isEstimated: true },
          update: { liters: litersPerCow, isEstimated: true },
        }),
      ),
    )

    // Remove participantes desmarcados (que estavam antes mas não estão na lista atual)
    await prisma.milkingSessionParticipant.deleteMany({
      where: {
        sessionId,
        animalId: { notIn: animalIds },
      },
    })

    auditLog({
      farmId,
      userId:   session.user.id,
      action:   'UPDATE',
      entity:   'MilkingSession',
      entityId: sessionId,
      after:    { participants: animalIds.length, litersPerCow },
    })

    revalidatePath('/milk')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[registerSessionParticipants]', error)
    return { success: false, error: 'Erro ao gravar participantes.', kind: 'network' }
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
