import { prisma }           from '@/lib/prisma'
import type { LotFiltersInput } from './schema'
import type {
  LotListItem,
  LotWithDetails,
  LotStats,
  PastureSelectOption,
  AnimalInLot,
} from './types'

// ─── Helper: computar stats a partir de grupos ─────────────

function buildEmptyStats(): LotStats {
  return { total: 0, cows: 0, heifers: 0, calves: 0, bulls: 0, steers: 0, males: 0, females: 0 }
}

function computeStatsFromAnimals(animals: AnimalInLot[]): LotStats {
  return animals.reduce<LotStats>((acc, a) => {
    acc.total   += 1
    if (a.sex      === 'MALE')   acc.males   += 1
    if (a.sex      === 'FEMALE') acc.females += 1
    if (a.category === 'COW')    acc.cows    += 1
    if (a.category === 'HEIFER') acc.heifers += 1
    if (a.category === 'CALF')   acc.calves  += 1
    if (a.category === 'BULL')   acc.bulls   += 1
    if (a.category === 'STEER')  acc.steers  += 1
    return acc
  }, buildEmptyStats())
}

// ─── Listagem de lotes ─────────────────────────────────────

/**
 * Retorna lotes com stats completas em 2 queries paralelas:
 * 1. Lotes com pasture select
 * 2. groupBy animal para computar distribuição por lote
 *
 * Evita N+1 na listagem de lotes com muitos animais.
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

    // Agrupa animais ativos por lote + sexo + categoria (1 query para todos os lotes)
    prisma.animal.groupBy({
      by:    ['lotId', 'sex', 'category'],
      where: { farmId, status: 'ACTIVE', lotId: { not: null } },
      _count: { id: true },
    }),
  ])

  // Monta o mapa de stats por lotId
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
 * Retorna o lote completo com animais ativos e stats computadas.
 * Animais projetados com os campos de AnimalCard (sem campos pesados).
 */
export async function getLotById(
  id:     string,
  farmId: string,
): Promise<LotWithDetails | null> {
  const lot = await prisma.lot.findFirst({
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
      },
    },
  })

  if (!lot) return null

  const animals: AnimalInLot[] = lot.animals.map((a) => ({
    ...a,
    primaryPhoto: a.photos[0] ?? null,
  }))

  return {
    ...lot,
    animals,
    stats: computeStatsFromAnimals(animals),
  }
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

/**
 * Retorna animais ativos da fazenda que NÃO estão no lote excluído.
 * Usado no TransferAnimalDialog para adicionar animais ao lote atual.
 *
 * Limite de 100 animais — filtragem adicional feita no cliente.
 */
export async function getAnimalsAvailableForLot(
  farmId:        string,
  excludeLotId?: string,
): Promise<AnimalInLot[]> {
  const animals = await prisma.animal.findMany({
    where: {
      farmId,
      status: 'ACTIVE',
      ...(excludeLotId && {
        NOT: { lotId: excludeLotId },
      }),
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
