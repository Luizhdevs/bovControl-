import { prisma }                from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import type { FeedTypeItem, FeedSessionItem, FeedDashboardData, FeedStats } from './types'

// ─── Seletor reutilizável para FeedSession ─────────────────────

const FEED_SESSION_SELECT = {
  id:                   true,
  date:                 true,
  bagCount:             true,
  totalWeightKg:        true,
  totalCost:            true,
  animalCount:          true,
  averageKgPerAnimal:   true,
  averageCostPerAnimal: true,
  notes:                true,
  createdAt:            true,
  lot: {
    select: { id: true, name: true, type: true },
  },
  feedType: {
    select: { id: true, name: true, brand: true, weightPerBagKg: true, pricePerBag: true },
  },
} as const

// ─── FeedType: listagem ───────────────────────────────────────

export async function getFeedTypesByFarm(
  farmId: string,
  onlyActive = false,
): Promise<FeedTypeItem[]> {
  return prisma.feedType.findMany({
    where:   { farmId, ...(onlyActive ? { active: true } : {}) },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })
}

export async function getFeedTypeById(
  id:     string,
  farmId: string,
): Promise<FeedTypeItem | null> {
  return prisma.feedType.findFirst({ where: { id, farmId } })
}

// ─── FeedSession: listagem ─────────────────────────────────────

export async function getFeedSessionsByFarm(
  farmId: string,
  days:   number = 30,
): Promise<FeedSessionItem[]> {
  const since = startOfDay(subDays(new Date(), days - 1))
  const until = endOfDay(new Date())

  return prisma.feedSession.findMany({
    where:   { farmId, date: { gte: since, lte: until } },
    select:  FEED_SESSION_SELECT,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  }) as unknown as FeedSessionItem[]
}

export async function getFeedSessionById(
  id:     string,
  farmId: string,
): Promise<(FeedSessionItem & { consumptions: { animalId: string; consumedKg: number; estimatedCost: number }[] }) | null> {
  return prisma.feedSession.findFirst({
    where:  { id, farmId },
    select: {
      ...FEED_SESSION_SELECT,
      consumptions: {
        select: { animalId: true, consumedKg: true, estimatedCost: true },
      },
    },
  }) as unknown as (FeedSessionItem & { consumptions: { animalId: string; consumedKg: number; estimatedCost: number }[] }) | null
}

// ─── FeedSession: histórico de um lote ────────────────────────

export async function getLotFeedHistory(
  lotId:  string,
  farmId: string,
  limit = 10,
): Promise<FeedSessionItem[]> {
  return prisma.feedSession.findMany({
    where:   { lotId, farmId },
    select:  FEED_SESSION_SELECT,
    orderBy: { date: 'desc' },
    take:    limit,
  }) as unknown as FeedSessionItem[]
}

// ─── AnimalFeedConsumption: histórico de um animal ────────────

export async function getAnimalFeedHistory(
  animalId: string,
  farmId:   string,
  limit = 10,
): Promise<{
  id:            string
  consumedKg:    number
  estimatedCost: number
  createdAt:     Date
  feedSession: {
    id:           string
    date:         Date
    totalWeightKg: number
    animalCount:  number
    lot:      { name: string }
    feedType: { name: string; brand: string | null }
  }
}[]> {
  return prisma.animalFeedConsumption.findMany({
    where: {
      animalId,
      feedSession: { farmId },
    },
    select: {
      id:            true,
      consumedKg:    true,
      estimatedCost: true,
      createdAt:     true,
      feedSession: {
        select: {
          id:            true,
          date:          true,
          totalWeightKg: true,
          animalCount:   true,
          lot:      { select: { name: true } },
          feedType: { select: { name: true, brand: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
}

// ─── Dashboard: dados de ração ────────────────────────────────

export async function getDashboardFeedData(farmId: string): Promise<FeedDashboardData> {
  const now        = new Date()
  const todayStart = startOfDay(now)
  const todayEnd   = endOfDay(now)
  const weekStart  = startOfDay(subDays(now, 6))

  // Hoje + semana em paralelo
  const [todaySessions, weekSessions] = await Promise.all([
    prisma.feedSession.findMany({
      where:  { farmId, date: { gte: todayStart, lte: todayEnd } },
      select: { totalWeightKg: true, totalCost: true, animalCount: true, averageKgPerAnimal: true },
    }),
    prisma.feedSession.findMany({
      where:  { farmId, date: { gte: weekStart, lte: todayEnd } },
      select: {
        totalWeightKg: true, totalCost: true,
        animalCount: true, averageKgPerAnimal: true,
        lot: { select: { name: true } },
      },
    }),
  ])

  const todayKg   = todaySessions.reduce((s, r) => s + r.totalWeightKg, 0)
  const todayCost = todaySessions.reduce((s, r) => s + r.totalCost,     0)
  const weeklyKg   = weekSessions.reduce((s, r) => s + r.totalWeightKg, 0)
  const weeklyCost = weekSessions.reduce((s, r) => s + r.totalCost,     0)

  // Lote com maior consumo na semana
  const lotMap = new Map<string, number>()
  for (const s of weekSessions) {
    const key = s.lot.name
    lotMap.set(key, (lotMap.get(key) ?? 0) + s.totalWeightKg)
  }
  let topLot: { name: string; kg: number } | null = null
  for (const [name, kg] of lotMap) {
    if (!topLot || kg > topLot.kg) topLot = { name, kg }
  }

  // Média ponderada kg/animal na semana
  const totalAnimals = weekSessions.reduce((s, r) => s + r.animalCount, 0)
  const avgKgPerAnimal = totalAnimals > 0 ? weeklyKg / totalAnimals : 0

  // Custo por litro (buscar produção de leite da semana)
  type RawRow = { liters: unknown }
  const milkRows = await prisma.$queryRaw<RawRow[]>`
    SELECT COALESCE(SUM("totalLiters"), 0) AS liters
    FROM milking_sessions
    WHERE "farmId" = ${farmId}
      AND date >= ${weekStart}::date
      AND date <= ${todayEnd}::date
  `
  const weekLiters = Number(milkRows[0]?.liters ?? 0)
  const costPerLiter = weekLiters > 0 ? weeklyCost / weekLiters : null

  return {
    todayKg,
    todayCost,
    weeklyKg,
    weeklyCost,
    costPerLiter,
    topLot,
    avgKgPerAnimal,
  }
}

// ─── Stats agregadas por período ──────────────────────────────

export async function getFeedStats(
  farmId: string,
  days:   number = 30,
): Promise<FeedStats> {
  const since = startOfDay(subDays(new Date(), days - 1))
  const until = endOfDay(new Date())

  type RawRow = { kg: unknown; cost: unknown; sessions: unknown }
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      COALESCE(SUM("totalWeightKg"), 0) AS kg,
      COALESCE(SUM("totalCost"),     0) AS cost,
      COUNT(*)                          AS sessions
    FROM feed_sessions
    WHERE "farmId" = ${farmId}
      AND date >= ${since}::date
      AND date <= ${until}::date
  `

  const row          = rows[0]!
  const periodKg     = Number(row.kg)
  const periodCost   = Number(row.cost)
  const sessionCount = Number(row.sessions)

  return {
    periodKg,
    periodCost,
    sessionCount,
    avgKgPerSession: sessionCount > 0 ? periodKg / sessionCount : 0,
  }
}

// ─── Animais com maior consumo acumulado ──────────────────────

export async function getTopFeedConsumptionAnimals(
  farmId: string,
  limit = 5,
): Promise<{ id: string; tag: string; name: string | null; totalFeedConsumedKg: number; estimatedFeedCost: number }[]> {
  return prisma.animal.findMany({
    where:   { farmId, status: 'ACTIVE', totalFeedConsumedKg: { gt: 0 } },
    select:  { id: true, tag: true, name: true, totalFeedConsumedKg: true, estimatedFeedCost: true },
    orderBy: { totalFeedConsumedKg: 'desc' },
    take:    limit,
  })
}

// ─── Histórico diário para gráfico (7 dias) ───────────────────

export async function getWeeklyFeedConsumption(
  farmId: string,
): Promise<{ date: string; kg: number; cost: number; label: string }[]> {
  const since = startOfDay(subDays(new Date(), 6))
  const until = endOfDay(new Date())

  type RawRow = { day: Date; kg: unknown; cost: unknown }
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT
      date_trunc('day', date::timestamp)    AS day,
      COALESCE(SUM("totalWeightKg"), 0)     AS kg,
      COALESCE(SUM("totalCost"),     0)     AS cost
    FROM feed_sessions
    WHERE "farmId" = ${farmId}
      AND date >= ${since}::date
      AND date <= ${until}::date
    GROUP BY date_trunc('day', date::timestamp)
    ORDER BY day ASC
  `

  const byDay = new Map<string, { kg: number; cost: number }>()
  for (const r of rows) {
    const key = new Date(r.day).toISOString().split('T')[0]!
    byDay.set(key, { kg: Number(r.kg), cost: Number(r.cost) })
  }

  const result: { date: string; kg: number; cost: number; label: string }[] = []
  for (let i = 6; i >= 0; i--) {
    const d   = subDays(new Date(), i)
    const key = format(d, 'yyyy-MM-dd')
    const val = byDay.get(key) ?? { kg: 0, cost: 0 }
    result.push({ date: key, ...val, label: format(d, 'EEE').slice(0, 3) })
  }
  return result
}

// ─── Lotes com contagem de animais ativos ─────────────────────
// Usado pelo formulário de sessão para preview em tempo real.

export async function getLotsWithActiveAnimalCount(
  farmId: string,
): Promise<{ id: string; name: string; type: string; activeAnimalCount: number }[]> {
  const lots = await prisma.lot.findMany({
    where:  { farmId, isActive: true },
    select: {
      id:   true,
      name: true,
      type: true,
      _count: { select: { animals: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: { name: 'asc' },
  })
  return lots.map((l) => ({
    id:                l.id,
    name:              l.name,
    type:              l.type,
    activeAnimalCount: l._count.animals,
  }))
}
