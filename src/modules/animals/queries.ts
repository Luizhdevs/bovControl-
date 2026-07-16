import { prisma } from '@/lib/prisma'
import { subDays } from 'date-fns'
import type { AnimalFiltersInput } from './schema'
import type {
  AnimalListItem,
  AnimalPage,
  AnimalWithRelations,
  AnimalSelectOption,
  AnimalStats,
  LotSelectOption,
} from './types'

// ─── Builder de where clause ──────────────────────────────

// Converte preset de idade em range de birthDate
function agePresetToBirthDateRange(preset: string | undefined) {
  if (!preset) return {}
  const today = new Date()
  const ranges: Record<string, { gte?: Date; lte?: Date }> = {
    '0-30':    { gte: subDays(today, 30) },
    '30-90':   { gte: subDays(today, 90),  lte: subDays(today, 30) },
    '90-180':  { gte: subDays(today, 180), lte: subDays(today, 90) },
    '180-365': { gte: subDays(today, 365), lte: subDays(today, 180) },
    '365-730': { gte: subDays(today, 730), lte: subDays(today, 365) },
    '730+':    { lte: subDays(today, 730) },
  }
  const range = ranges[preset]
  return range ? { birthDate: range } : {}
}

function buildAnimalWhere(
  farmId:  string,
  filters: Partial<AnimalFiltersInput>,
) {
  const {
    search,
    sex,
    category,
    status    = 'ACTIVE',
    purpose,
    lotId,
    pastureId,
    agePreset,
  } = filters

  // status 'ALL' = não filtrar por status
  const effectiveStatus = status === 'ALL' ? undefined : status

  // lotId e pastureId são mutuamente exclusivos: pastureId filtra via lot.pastureId
  const lotFilter =
    pastureId === 'none' ? { lot: { is: null } }
    : pastureId          ? { lot: { pastureId } }
    : lotId === 'none'   ? { lotId: null }
    : lotId              ? { lotId }
    : {}

  return {
    farmId,
    ...(effectiveStatus && { status: effectiveStatus }),
    ...(sex      && { sex }),
    ...(category && { category }),
    ...(purpose  && { purpose }),
    ...lotFilter,
    ...agePresetToBirthDateRange(agePreset),
    ...(search && {
      OR: [
        { tag:  { contains: search, mode: 'insensitive' as const } },
        { name: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }
}

const ANIMAL_LIST_SELECT = {
  id:        true,
  tag:       true,
  name:      true,
  sex:       true,
  category:  true,
  status:    true,
  purpose:   true,
  breed:     true,
  birthDate: true,
  lot: {
    select: {
      id:       true,
      name:     true,
      type:     true,
      pasture:  { select: { id: true, name: true } },
    },
  },
  photos: {
    where:  { isPrimary: true },
    select: { url: true, thumbnailUrl: true },
    take:   1,
  },
  _count: {
    select: { photos: true },
  },
}

// ─── Listagem paginada ────────────────────────────────────

/**
 * Retorna página de animais + total em 2 queries paralelas.
 * Padrão: 50 animais por página, page = 1.
 */
export async function getAnimalsByFarm(
  farmId:   string,
  filters:  Partial<AnimalFiltersInput> = {},
  page      = 1,
  pageSize  = 50,
): Promise<AnimalPage> {
  const where = buildAnimalWhere(farmId, filters)
  const skip  = (page - 1) * pageSize

  const [animals, total] = await Promise.all([
    prisma.animal.findMany({
      where,
      select:  ANIMAL_LIST_SELECT,
      orderBy: [{ category: 'asc' }, { tag: 'asc' }],
      skip,
      take:    pageSize,
    }),
    prisma.animal.count({ where }),
  ])

  return {
    items:     animals.map((a) => ({ ...a, primaryPhoto: a.photos[0] ?? null })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

// ─── Detalhes ──────────────────────────────────────────────

export async function getAnimalById(
  id:     string,
  farmId: string,
): Promise<AnimalWithRelations | null> {
  return prisma.animal.findFirst({
    where: { id, farmId },
    include: {
      lot:    true,
      mother: { select: { id: true, tag: true, name: true } },
      father: { select: { id: true, tag: true, name: true } },
      maternalChildren: {
        select:  { id: true, tag: true, name: true, sex: true, category: true, birthDate: true, status: true },
        orderBy: { birthDate: 'desc' },
      },
      photos: { orderBy: { takenAt: 'desc' } },
      weightRecords: {
        orderBy: { measuredAt: 'desc' },
        take:    10,
      },
      reproductions: {
        orderBy: { date: 'desc' },
        take:    5,
      },
      _count: {
        select: { milkRecords: true, healthEvents: true, photos: true },
      },
    },
  })
}

// ─── Seleção de pais (combobox) ────────────────────────────

export async function getAnimalsForParentSelect(
  farmId: string,
  sex:    'MALE' | 'FEMALE',
  search?: string,
): Promise<AnimalSelectOption[]> {
  return prisma.animal.findMany({
    where: {
      farmId,
      sex,
      status: 'ACTIVE',
      ...(search && {
        OR: [
          { tag:  { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: { id: true, tag: true, name: true, sex: true, category: true },
    orderBy: { tag: 'asc' },
    take: 50,
  })
}

// ─── Seleção de lotes (form de animal) ────────────────────

export async function getLotsForSelect(farmId: string): Promise<LotSelectOption[]> {
  return prisma.lot.findMany({
    where:   { farmId, isActive: true },
    select: {
      id:          true,
      name:        true,
      type:        true,
      maxCapacity: true,
      _count:      { select: { animals: true } },
    },
    orderBy: { name: 'asc' },
  })
}

// ─── Estatísticas ──────────────────────────────────────────

export async function getAnimalStats(farmId: string): Promise<AnimalStats> {
  const byCategory = await prisma.animal.groupBy({
    by:    ['category'],
    where: { farmId, status: 'ACTIVE' },
    _count: { id: true },
  })

  const countOf = (cat: string) =>
    byCategory.find((b) => b.category === cat)?._count.id ?? 0

  const total = byCategory.reduce((sum, b) => sum + b._count.id, 0)

  return {
    total,
    cows:    countOf('COW'),
    heifers: countOf('HEIFER'),
    calves:  countOf('CALF'),
    bulls:   countOf('BULL'),
    steers:  countOf('STEER'),
  }
}

// ─── Animais recém adicionados ────────────────────────────

export async function getRecentAnimalsCount(
  farmId: string,
  days    = 7,
): Promise<number> {
  return prisma.animal.count({
    where: {
      farmId,
      status:    'ACTIVE',
      createdAt: { gte: subDays(new Date(), days) },
    },
  })
}

// ─── Geração de tag ───────────────────────────────────────

/**
 * Gera o próximo tag disponível para a fazenda (formato BOV-XXXX).
 *
 * Busca apenas o tag mais alto (1 linha) em vez de carregar todos.
 * Tags seguem BOV-NNNN (padding fixo de 4 dígitos), portanto
 * ordenação lexicográfica = ordenação numérica para até 9999 animais.
 *
 * Nota: sujeito a race condition em cadastros simultâneos de alta
 * frequência. Para produção com muitos usuários, usar sequência
 * PostgreSQL por fazenda (nextval).
 */
export async function generateAnimalTag(farmId: string): Promise<string> {
  const latest = await prisma.animal.findFirst({
    where:   { farmId },
    select:  { tag: true },
    orderBy: { tag: 'desc' },
  })

  const maxNum = latest
    ? (parseInt(latest.tag.match(/(\d+)$/)?.[1] ?? '0', 10) || 0)
    : 0

  return `BOV-${String(maxNum + 1).padStart(4, '0')}`
}

// ─── Pastos para select ───────────────────────────────────

export async function getPasturesForSelect(farmId: string) {
  return prisma.pasture.findMany({
    where:   { farmId },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}
