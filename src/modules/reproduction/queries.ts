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
      date: { gte: since },
    },
    include: {
      animal: { select: { id: true, tag: true, name: true, category: true, sex: true } },
    },
    orderBy: { date: 'desc' },
    take:    200,
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

// ─── Animais prenhes (PREGNANCY_CHECK CONFIRMED mais recente) ─

/**
 * Retorna animais cujo último PREGNANCY_CHECK tem status CONFIRMED.
 * Agrupa em JS para evitar limitações do Prisma com distinct+orderBy.
 */
export async function getPregnantAnimals(farmId: string): Promise<UpcomingCalving[]> {
  const checks = await prisma.reproduction.findMany({
    where: {
      animal: { farmId },
      type:   'PREGNANCY_CHECK',
    },
    include: {
      animal: { select: { id: true, tag: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take:    500, // limite de escala
  })

  // Para cada animal, pega apenas o check mais recente
  const latestByAnimal = new Map<string, typeof checks[0]>()
  for (const check of checks) {
    if (!latestByAnimal.has(check.animalId)) {
      latestByAnimal.set(check.animalId, check)
    }
  }

  const today = new Date()

  return Array.from(latestByAnimal.values())
    .filter((check) => check.status === 'CONFIRMED')
    .map((check) => ({
      animalId:            check.animalId,
      tag:                 check.animal.tag,
      name:                check.animal.name,
      expectedCalvingDate: check.nextCheckDate ?? addDays(check.date, 280),
      daysUntilCalving:    differenceInDays(
        check.nextCheckDate ?? addDays(check.date, 280),
        today,
      ),
      confirmedAt: check.date,
    }))
    .sort((a, b) => a.daysUntilCalving - b.daysUntilCalving)
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

  // Último check de gestação
  const lastCheck = events.find((e) => e.type === 'PREGNANCY_CHECK')

  // Última inseminação/monta
  const lastInsemination = events.find(
    (e) => e.type === 'INSEMINATION' || e.type === 'NATURAL_MATING',
  )

  // Status de prenhez derivado do check mais recente
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
    // Conta prenhes (simplificado — pode ter falsos positivos se houver FAILED posterior)
    getPregnantAnimals(farmId).then((a) => a.length),

    // Inseminações e montas nos últimos 30 dias
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
