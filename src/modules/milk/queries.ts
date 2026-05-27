import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import type { MilkRecordWithAnimal, DailyMilkSummary, MilkingSessionItem } from './types'
import type { MilkingSession } from '@prisma/client'

// ─── Helper interno ────────────────────────────────────────────

function toSessionItem(s: MilkingSession): MilkingSessionItem {
  return {
    id:          s.id,
    shift:       s.shift,
    date:        s.date,
    totalLiters: s.totalLiters,
    milkingCows: s.milkingCows,
    avgPerCow:   s.milkingCows > 0 ? s.totalLiters / s.milkingCows : 0,
    notes:       s.notes,
  }
}

// ─── Resumo diário completo (página /milk) ─────────────────────

/**
 * Retorna as sessões de ordenha do dia.
 * Eficiente: no máximo 2 linhas por dia (MORNING + AFTERNOON).
 */
export async function getDailyMilkSummary(
  farmId: string,
  date:   Date = new Date(),
): Promise<DailyMilkSummary> {
  const sessions = await prisma.milkingSession.findMany({
    where: {
      farmId,
      date: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
    orderBy: { shift: 'asc' },
  })

  const morningRaw   = sessions.find((s) => s.shift === 'MORNING')   ?? null
  const afternoonRaw = sessions.find((s) => s.shift === 'AFTERNOON') ?? null

  const morning   = morningRaw   ? toSessionItem(morningRaw)   : null
  const afternoon = afternoonRaw ? toSessionItem(afternoonRaw) : null

  const totalLiters = (morning?.totalLiters ?? 0) + (afternoon?.totalLiters ?? 0)
  // Representa tamanho do rebanho: usa o maior registro entre os turnos
  const totalCows   = Math.max(morning?.milkingCows ?? 0, afternoon?.milkingCows ?? 0)

  return {
    date,
    totalLiters,
    totalCows,
    avgPerCow: totalCows > 0 ? totalLiters / totalCows : 0,
    morning,
    afternoon,
  }
}

// ─── Dados de leite para o dashboard (lean) ───────────────────

/**
 * Retorna totais de hoje + ontem + por turno.
 * Baseado em milking_sessions — eficiente, no máximo 4 linhas.
 */
export async function getDashboardMilkData(farmId: string): Promise<{
  today:     number
  yesterday: number
  byShift: { MORNING: number; AFTERNOON: number }
}> {
  const now      = new Date()
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)
  const yestStart  = startOfDay(subDays(now, 1))
  const yestEnd    = endOfDay(subDays(now, 1))

  const [todaySessions, yestSessions] = await Promise.all([
    prisma.milkingSession.findMany({
      where:  { farmId, date: { gte: todayStart, lte: todayEnd } },
      select: { shift: true, totalLiters: true },
    }),
    prisma.milkingSession.findMany({
      where:  { farmId, date: { gte: yestStart, lte: yestEnd } },
      select: { totalLiters: true },
    }),
  ])

  const byShift = { MORNING: 0, AFTERNOON: 0 }
  for (const s of todaySessions) {
    byShift[s.shift] = (byShift[s.shift] ?? 0) + s.totalLiters
  }

  return {
    today:     byShift.MORNING + byShift.AFTERNOON,
    yesterday: yestSessions.reduce((sum, s) => sum + s.totalLiters, 0),
    byShift,
  }
}

// ─── Histórico de produção para gráfico ───────────────────────

/**
 * Agrega sessões por dia no banco — eficiente para qualquer período.
 */
export async function getMilkHistoryByFarm(
  farmId: string,
  days:   number = 30,
): Promise<{ date: string; liters: number }[]> {
  const since = startOfDay(subDays(new Date(), days))
  const until = endOfDay(new Date())

  type RawRow = { day: Date; liters: unknown }
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      date_trunc('day', date::timestamp) AS day,
      SUM("totalLiters")                 AS liters
    FROM milking_sessions
    WHERE "farmId"  = ${farmId}
      AND date >= ${since}::date
      AND date <= ${until}::date
    GROUP BY date_trunc('day', date::timestamp)
    ORDER BY day ASC
  `

  return rows.map((r) => ({
    date:   new Date(r.day).toISOString().split('T')[0]!,
    liters: Number(r.liters),
  }))
}

// ─── Sessões por período (histórico detalhado) ────────────────

/**
 * Lista sessões individuais para a tabela de histórico.
 * Inclui dados de turno, cows, avg/cow.
 */
export async function getMilkingSessionsByFarm(
  farmId: string,
  days:   number = 30,
): Promise<MilkingSessionItem[]> {
  const since = startOfDay(subDays(new Date(), days))
  const until = endOfDay(new Date())

  const sessions = await prisma.milkingSession.findMany({
    where: {
      farmId,
      date: { gte: since, lte: until },
    },
    orderBy: [{ date: 'desc' }, { shift: 'asc' }],
  })

  return sessions.map(toSessionItem)
}

// ─── Produção semanal (7 dias — com dias sem registro zerados) ─

/**
 * Retorna produção agregada por dia nos últimos 7 dias.
 * Dias sem sessão são preenchidos com 0.
 */
export async function getWeeklyProduction(
  farmId: string,
): Promise<{ date: string; liters: number; label: string }[]> {
  const since = startOfDay(subDays(new Date(), 6))
  const until = endOfDay(new Date())

  type RawRow = { day: Date; liters: unknown }
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      date_trunc('day', date::timestamp)    AS day,
      COALESCE(SUM("totalLiters"), 0)       AS liters
    FROM milking_sessions
    WHERE "farmId"  = ${farmId}
      AND date >= ${since}::date
      AND date <= ${until}::date
    GROUP BY date_trunc('day', date::timestamp)
    ORDER BY day ASC
  `

  // Indexa por YYYY-MM-DD
  const byDay = new Map<string, number>()
  for (const r of rows) {
    const key = new Date(r.day).toISOString().split('T')[0]!
    byDay.set(key, Number(r.liters))
  }

  // Garante todos os 7 dias (zeros incluídos)
  const result: { date: string; liters: number; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d   = subDays(new Date(), i)
    const key = format(d, 'yyyy-MM-dd')
    result.push({
      date:   key,
      liters: byDay.get(key) ?? 0,
      label:  format(d, 'EEE').slice(0, 3),
    })
  }

  return result
}

// ─── Registros individuais por animal (Fase 2 / legado) ───────

export async function getMilkRecordsByAnimal(
  animalId: string,
  farmId:   string,
  limit?:   number,
): Promise<MilkRecordWithAnimal[]> {
  return prisma.milkRecord.findMany({
    where: { animalId, farmId },
    include: {
      animal: { select: { id: true, tag: true, name: true, category: true } },
    },
    orderBy: { recordedAt: 'desc' },
    take:    limit,
  })
}
