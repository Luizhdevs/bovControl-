import { prisma }    from '@/lib/prisma'
import { addDays, differenceInDays } from 'date-fns'
import type {
  ReproductionWithAnimal,
  AnimalForReproduction,
  AnimalReproductionSummary,
  UpcomingCalving,
  PregnancyStatus,
} from './types'

// ─── Registros por animal ──────────────────────────────────

export async function getReproductionsByAnimal(
  animalId: string,
  farmId:   string,
  limit     = 50,
): Promise<ReproductionWithAnimal[]> {
  return prisma.reproduction.findMany({
    where: {
      animalId,
      animal: { farmId },
    },
    include: {
      animal: { select: { id: true, tag: true, name: true, category: true, sex: true } },
    },
    orderBy: { date: 'desc' },
    take:    limit,
  })
}

// ─── Histórico de toda a fazenda ──────────────────────────

export async function getReproductionHistory(
  farmId: string,
  days    = 30,
): Promise<ReproductionWithAnimal[]> {
  const since = addDays(new Date(), -days)

  return prisma.reproduction.findMany({
    where: {
      animal: { farmId },
      date:   { gte: since },
    },
    include: {
      animal: { select: { id: true, tag: true, name: true, category: true, sex: true } },
    },
    orderBy: { date: 'desc' },
    take:    100,
  })
}

// ─── Animais elegíveis para reprodução ────────────────────

export async function getAnimalsForReproduction(
  farmId: string,
): Promise<AnimalForReproduction[]> {
  return prisma.animal.findMany({
    where: {
      farmId,
      status:   'ACTIVE',
      sex:      'FEMALE',
      category: { in: ['HEIFER', 'COW'] },
    },
    select: {
      id:       true,
      tag:      true,
      name:     true,
      category: true,
      lot:      { select: { id: true, name: true } },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take:    500,
  })
}

// ─── Animais prenhes — DISTINCT ON (1 query eficiente) ────

/**
 * Usa DISTINCT ON para obter o último PREGNANCY_CHECK por animal.
 * Muito mais eficiente que a abordagem anterior (JavaScript groupBy).
 *
 * @param limit  Se informado, retorna apenas os primeiros N mais próximos do parto.
 */
export async function getPregnantAnimals(
  farmId: string,
  limit?: number,
): Promise<UpcomingCalving[]> {
  type RawRow = {
    animalId:      string
    status:        string
    confirmedAt:   Date
    nextCheckDate: Date | null
    tag:           string
    name:          string | null
  }

  // Subquery garante: (1) DISTINCT ON pega o ÚLTIMO check por animal,
  // (2) filtro externo WHERE status='CONFIRMED' descarta animais cujo
  // check mais recente foi FAILED — correto mesmo sem filtro JS.
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT latest.*
    FROM (
      SELECT DISTINCT ON (r."animalId")
        r."animalId"      AS "animalId",
        r.status,
        r.date            AS "confirmedAt",
        r."nextCheckDate",
        a.tag,
        a.name
      FROM reproductions r
      JOIN animals a ON a.id = r."animalId"
      WHERE r.type = 'PREGNANCY_CHECK'
        AND a."farmId" = ${farmId}
        AND a.status   = 'ACTIVE'
      ORDER BY r."animalId", r.date DESC
    ) latest
    WHERE latest.status = 'CONFIRMED'
  `

  const today = new Date()

  const result = rows
    .map((r) => ({
      animalId:            r.animalId,
      tag:                 r.tag,
      name:                r.name,
      expectedCalvingDate: r.nextCheckDate ?? addDays(r.confirmedAt, 280),
      daysUntilCalving:    differenceInDays(
        r.nextCheckDate ?? addDays(r.confirmedAt, 280),
        today,
      ),
      confirmedAt: r.confirmedAt,
    }))
    .sort((a, b) => a.daysUntilCalving - b.daysUntilCalving)

  return limit !== undefined ? result.slice(0, limit) : result
}

// ─── Resumo reprodutivo de um animal ──────────────────────

export async function getAnimalReproductionSummary(
  animalId: string,
  farmId:   string,
): Promise<AnimalReproductionSummary | null> {
  const animal = await prisma.animal.findFirst({
    where:  { id: animalId, farmId },
    select: {
      id:       true,
      tag:      true,
      name:     true,
      category: true,
      sex:      true,
      status:   true,
      lot:      { select: { id: true, name: true } },
      reproductions: {
        orderBy: { date: 'desc' },
        take:    50,
      },
    },
  })

  if (!animal) return null

  const events      = animal.reproductions
  const totalEvents = events.length

  const lastCheck        = events.find((e) => e.type === 'PREGNANCY_CHECK')
  const lastInsemination = events.find(
    (e) => e.type === 'INSEMINATION' || e.type === 'NATURAL_MATING',
  )

  let pregnancyStatus: PregnancyStatus = 'unknown'
  if (lastCheck) {
    if (lastCheck.status === 'CONFIRMED') pregnancyStatus = 'pregnant'
    else if (lastCheck.status === 'FAILED') pregnancyStatus = 'not_pregnant'
  }

  return {
    animal:              { ...animal, lot: animal.lot },
    pregnancyStatus,
    lastCheckDate:       lastCheck?.date ?? null,
    expectedCalvingDate: pregnancyStatus === 'pregnant'
      ? (lastCheck?.nextCheckDate ?? addDays(lastCheck!.date, 280))
      : null,
    lastInseminationDate: lastInsemination?.date ?? null,
    totalEvents,
  }
}

// ─── Estatísticas rápidas do dashboard ────────────────────

export async function getReproductionStats(farmId: string) {
  const [totalPregnant, recentInseminations] = await Promise.all([
    getPregnantAnimals(farmId).then((a) => a.length),
    prisma.reproduction.count({
      where: {
        animal: { farmId },
        type:   { in: ['INSEMINATION', 'NATURAL_MATING'] },
        date:   { gte: addDays(new Date(), -30) },
      },
    }),
  ])

  return { totalPregnant, recentInseminations }
}
