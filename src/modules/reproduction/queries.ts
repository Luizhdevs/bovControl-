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
 * Retorna todas as vacas com prenhez confirmada, incluindo confirmadas via
 * protocolo TE (DG P30+). Exclui animais que já pariram após a confirmação
 * usando lastCalvingDate — necessário porque re-inseminações recentes (ex:
 * TE Set/2026) fazem o NOT EXISTS da CALVING falhar quando o parto ocorreu
 * antes da nova inseminação.
 *
 * @param limit  Se informado, retorna apenas os primeiros N mais próximos do parto.
 */
export async function getPregnantAnimals(
  farmId: string,
  limit?: number,
): Promise<UpcomingCalving[]> {
  // ── Part 1: confirmadas via PREGNANCY_CHECK ────────────────
  type RawRow = {
    animalId:        string
    status:          string
    confirmedAt:     Date
    nextCheckDate:   Date | null
    tag:             string
    name:            string | null
    lastCalvingDate: Date | null
  }

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT latest.*
    FROM (
      SELECT DISTINCT ON (r."animalId")
        r."animalId"         AS "animalId",
        r.status,
        r.date               AS "confirmedAt",
        r."nextCheckDate",
        a.tag,
        a.name,
        a."lastCalvingDate"
      FROM reproductions r
      JOIN animals a ON a.id = r."animalId"
      WHERE r.type = 'PREGNANCY_CHECK'
        AND a."farmId" = ${farmId}
        AND a.status   = 'ACTIVE'
      ORDER BY r."animalId", r.date DESC
    ) latest
    WHERE latest.status = 'CONFIRMED'
      AND NOT (
        latest."lastCalvingDate" IS NOT NULL
        AND latest."lastCalvingDate" >= latest."confirmedAt"
      )
      AND NOT EXISTS (
        SELECT 1 FROM reproductions calv
        WHERE calv."animalId" = latest."animalId"
          AND calv.type = 'CALVING'
          AND calv.date >= (
            SELECT COALESCE(
              MAX(ins.date),
              latest."confirmedAt" - INTERVAL '365 days'
            )
            FROM reproductions ins
            WHERE ins."animalId" = latest."animalId"
              AND ins.type IN ('INSEMINATION', 'NATURAL_MATING')
          )
      )
  `

  // ── Part 2: confirmadas via protocolo TE (DG P30+) ────────
  // Inseminações TE com status CONFIRMED que ainda não pariram.
  // A previsão usa prevParto do protocolo ou teDate + 280 dias.
  type TERawRow = {
    animalId:        string
    teDate:          Date
    tag:             string
    name:            string | null
    lastCalvingDate: Date | null
    prevParto:       Date | null
  }

  const teRows = await prisma.$queryRaw<TERawRow[]>`
    SELECT DISTINCT ON (r."animalId")
      r."animalId"          AS "animalId",
      r.date                AS "teDate",
      a.tag,
      a.name,
      a."lastCalvingDate",
      proto."prevParto"
    FROM reproductions r
    JOIN animals a ON a.id = r."animalId"
    LEFT JOIN te_participations tp    ON tp."reproductionId" = r.id
    LEFT JOIN te_protocols      proto ON proto.id = tp."protocolId"
    WHERE r.type   = 'INSEMINATION'
      AND r.status = 'CONFIRMED'
      AND r."bullName" LIKE 'TE:%'
      AND a."farmId" = ${farmId}
      AND a.status   = 'ACTIVE'
      AND NOT (
        a."lastCalvingDate" IS NOT NULL
        AND a."lastCalvingDate" >= r.date
      )
    ORDER BY r."animalId", r.date DESC
  `

  const today = new Date()
  const regularAnimalIds = new Set(rows.map((r) => r.animalId))

  const regularResults = rows.map((r) => ({
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

  const teResults = teRows
    .filter((r) => !regularAnimalIds.has(r.animalId))
    .map((r) => ({
      animalId:            r.animalId,
      tag:                 r.tag,
      name:                r.name,
      expectedCalvingDate: r.prevParto ?? addDays(r.teDate, 280),
      daysUntilCalving:    differenceInDays(
        r.prevParto ?? addDays(r.teDate, 280),
        today,
      ),
      confirmedAt: r.teDate,
    }))

  const result = [...regularResults, ...teResults]
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
