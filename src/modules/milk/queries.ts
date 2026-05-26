import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import type { MilkRecordWithAnimal, DailyMilkSummary, AnimalForMilk } from './types'

// ─── Registros por animal ──────────────────────────────────

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

// ─── Resumo diário da fazenda ──────────────────────────────

export async function getDailyMilkSummary(
  farmId: string,
  date:   Date = new Date(),
): Promise<DailyMilkSummary> {
  const records = await prisma.milkRecord.findMany({
    where: {
      farmId,
      recordedAt: {
        gte: startOfDay(date),
        lte: endOfDay(date),
      },
    },
    include: {
      animal: { select: { id: true, tag: true, name: true, category: true } },
    },
    orderBy: { recordedAt: 'asc' },
  })

  // Acumula em passo único: total, por turno e por animal
  const byShift   = { MORNING: 0, AFTERNOON: 0 }
  const animalIds = new Set<string>()
  let totalLiters = 0
  const byAnimal  = new Map<string, typeof records>()

  for (const r of records) {
    totalLiters += r.liters
    if (r.shift === 'MORNING' || r.shift === 'AFTERNOON') {
      byShift[r.shift] += r.liters
    }
    animalIds.add(r.animalId)

    const bucket = byAnimal.get(r.animalId)
    if (bucket) bucket.push(r)
    else byAnimal.set(r.animalId, [r])
  }

  const topAnimals = Array.from(byAnimal.entries())
    .map(([animalId, animalRecords]) => ({
      animalId,
      tag:      animalRecords[0]!.animal.tag,
      name:     animalRecords[0]!.animal.name,
      totalDay: animalRecords.reduce((s, r) => s + r.liters, 0),
      records:  animalRecords,
    }))
    .sort((a, b) => b.totalDay - a.totalDay)
    .slice(0, 10)

  return {
    date,
    totalLiters,
    animalCount: animalIds.size,
    byShift,
    topAnimals,
  }
}

// ─── Animais elegíveis para registrar leite ───────────────

/**
 * Retorna vacas e novilhas ativas da fazenda.
 * Protegido por take:500 como limite de escala.
 */
export async function getAnimalsForMilkRegister(
  farmId: string,
): Promise<AnimalForMilk[]> {
  return prisma.animal.findMany({
    where: {
      farmId,
      status:   'ACTIVE',
      sex:      'FEMALE',
      category: { in: ['COW', 'HEIFER'] },
    },
    select: {
      id:       true,
      tag:      true,
      name:     true,
      category: true,
      lot: { select: { id: true, name: true } },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take:    500,
  })
}

// ─── Histórico de produção para gráfico ───────────────────

export async function getMilkHistoryByFarm(
  farmId: string,
  days:   number = 30,
): Promise<{ date: string; liters: number }[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const records = await prisma.milkRecord.findMany({
    where:   { farmId, recordedAt: { gte: since } },
    select:  { liters: true, recordedAt: true },
    orderBy: { recordedAt: 'asc' },
  })

  // Agrupa por dia em passo único
  const byDay = new Map<string, number>()
  for (const r of records) {
    const day = r.recordedAt.toISOString().split('T')[0]!
    byDay.set(day, (byDay.get(day) ?? 0) + r.liters)
  }

  return Array.from(byDay.entries()).map(([date, liters]) => ({ date, liters }))
}
