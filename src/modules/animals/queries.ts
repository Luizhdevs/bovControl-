import { prisma } from '@/lib/prisma'
import type { AnimalFiltersInput } from './schema'
import type {
  AnimalListItem,
  AnimalWithRelations,
  AnimalSelectOption,
  AnimalStats,
  LotSelectOption,
} from './types'

// ─── Listagem ──────────────────────────────────────────────

export async function getAnimalsByFarm(
  farmId:  string,
  filters: Partial<AnimalFiltersInput> = {},
): Promise<AnimalListItem[]> {
  const {
    search,
    sex,
    category,
    status  = 'ACTIVE',
    purpose,
    lotId,
  } = filters

  const animals = await prisma.animal.findMany({
    where: {
      farmId,
      status,
      ...(sex      && { sex }),
      ...(category && { category }),
      ...(purpose  && { purpose }),
      ...(lotId    && { lotId }),
      ...(search   && {
        OR: [
          { tag:  { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
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
      lot: {
        select: { id: true, name: true, type: true },
      },
      photos: {
        where:  { isPrimary: true },
        select: { url: true },
        take:   1,
      },
      _count: {
        select: { photos: true },
      },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
  })

  return animals.map((a) => ({
    ...a,
    primaryPhoto: a.photos[0] ?? null,
  }))
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
