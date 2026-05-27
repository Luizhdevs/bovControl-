import { prisma }           from '@/lib/prisma'
import type { LotFiltersInput } from './schema'
import type {
  LotListItem,
  LotWithDetails,
  LotStats,
  PastureSelectOption,
  AnimalInLot,
} from './types'

// ─── Helper: stats vazio ───────────────────────────────────

function buildEmptyStats(): LotStats {
  return { total: 0, cows: 0, heifers: 0, calves: 0, bulls: 0, steers: 0, males: 0, females: 0 }
}

// ─── Listagem de lotes ─────────────────────────────────────

/**
 * Retorna lotes com stats completas em 2 queries paralelas:
 * 1. Lotes com pasture select
 * 2. groupBy animal por lote/sexo/categoria
 *
 * Evita N+1.
 */
export async function getLotsByFarm(
  farmId:  string,
  filters: Partial<LotFiltersInput> = {},
): Promise<LotListItem[]> {
  const { search, type } = filters

  const [lots, animalGroups] = await Promise.all([
    prisma.lot.findMany({
      where: {
        farmId,
        isActive: true,
        ...(type   && { type }),
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
      },
      select: {
        id:          true,
        name:        true,
        type:        true,
        maxCapacity: true,
        isActive:    true,
        pasture: { select: { id: true, name: true } },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    }),

    prisma.animal.groupBy({
      by:    ['lotId', 'sex', 'category'],
      where: { farmId, status: 'ACTIVE', lotId: { not: null } },
      _count: { id: true },
    }),
  ])

  const statsMap = new Map<string, LotStats>()

  for (const group of animalGroups) {
    if (!group.lotId) continue

    const stats = statsMap.get(group.lotId) ?? buildEmptyStats()
    const n     = group._count.id

    stats.total += n
    if (group.sex      === 'MALE')   stats.males   += n
    if (group.sex      === 'FEMALE') stats.females += n
    if (group.category === 'COW')    stats.cows    += n
    if (group.category === 'HEIFER') stats.heifers += n
    if (group.category === 'CALF')   stats.calves  += n
    if (group.category === 'BULL')   stats.bulls   += n
    if (group.category === 'STEER')  stats.steers  += n

    statsMap.set(group.lotId, stats)
  }

  return lots.map((lot) => ({
    ...lot,
    stats: statsMap.get(lot.id) ?? buildEmptyStats(),
  }))
}

// ─── Detalhes do lote ──────────────────────────────────────

/**
 * Retorna o lote completo com os primeiros 100 animais ativos e
 * stats precisas (calculadas via groupBy — independente do take).
 */
export async function getLotById(
  id:     string,
  farmId: string,
): Promise<LotWithDetails | null> {
  const [lot, animalGroups] = await Promise.all([
    prisma.lot.findFirst({
      where: { id, farmId },
      include: {
        pasture: {
          select: { id: true, name: true, areaHectares: true, grassType: true },
        },
        animals: {
          where:   { status: 'ACTIVE' },
          select: {
            id:        true,
            tag:       true,
            name:      true,
            sex:       true,
            category:  true,
            status:    true,
            purpose:   true,
            breed:     true,
            birthDate: true,
            lot: { select: { id: true, name: true, type: true } },
            photos: {
              where:  { isPrimary: true },
              select: { url: true },
              take:   1,
            },
            _count: { select: { photos: true } },
          },
          orderBy: [{ category: 'asc' }, { tag: 'asc' }],
          take:    100, // display limit — stats são computadas via groupBy abaixo
        },
      },
    }),

    // groupBy para stats precisas (não afetado pelo take:100 acima)
    prisma.animal.groupBy({
      by:    ['sex', 'category'],
      where: { lotId: id, farmId, status: 'ACTIVE' },
      _count: { id: true },
    }),
  ])

  if (!lot) return null

  // Stats precisas via groupBy
  const stats = buildEmptyStats()
  for (const g of animalGroups) {
    const n = g._count.id
    stats.total += n
    if (g.sex      === 'MALE')   stats.males   += n
    if (g.sex      === 'FEMALE') stats.females += n
    if (g.category === 'COW')    stats.cows    += n
    if (g.category === 'HEIFER') stats.heifers += n
    if (g.category === 'CALF')   stats.calves  += n
    if (g.category === 'BULL')   stats.bulls   += n
    if (g.category === 'STEER')  stats.steers  += n
  }

  const animals: AnimalInLot[] = lot.animals.map((a) => ({
    ...a,
    primaryPhoto: a.photos[0] ?? null,
  }))

  return { ...lot, animals, stats }
}

// ─── Pastos disponíveis (select do form) ──────────────────

export async function getPasturesForSelect(farmId: string): Promise<PastureSelectOption[]> {
  return prisma.pasture.findMany({
    where:  { farmId, isActive: true },
    select: {
      id:           true,
      name:         true,
      areaHectares: true,
      maxCapacity:  true,
      _count:       { select: { lots: true } },
    },
    orderBy: { name: 'asc' },
  })
}

// ─── Animais disponíveis para movimentação ─────────────────

export async function getAnimalsAvailableForLot(
  farmId:        string,
  excludeLotId?: string,
): Promise<AnimalInLot[]> {
  const animals = await prisma.animal.findMany({
    where: {
      farmId,
      status: 'ACTIVE',
      ...(excludeLotId && { NOT: { lotId: excludeLotId } }),
    },
    select: {
      id:        true,
      tag:       true,
      name:      true,
      sex:       true,
      category:  true,
      status:    true,
      purpose:   true,
      breed:     true,
      birthDate: true,
      lot: { select: { id: true, name: true, type: true } },
      photos: {
        where:  { isPrimary: true },
        select: { url: true },
        take:   1,
      },
      _count: { select: { photos: true } },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take: 100,
  })

  return animals.map((a) => ({
    ...a,
    primaryPhoto: a.photos[0] ?? null,
  }))
}
