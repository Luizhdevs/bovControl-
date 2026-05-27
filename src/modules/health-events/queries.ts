import { prisma }    from '@/lib/prisma'
import type {
  HealthEventItem,
  HealthEventPage,
} from './types'
import type { HealthEventFiltersInput } from './schema'

const PAGE_SIZE = 20

// ─── Select reutilizável ──────────────────────────────────

const HEALTH_EVENT_SELECT = {
  id:          true,
  animalId:    true,
  type:        true,
  description: true,
  medication:  true,
  cost:        true,
  occurredAt:  true,
  resolved:    true,
  notes:       true,
  animal: {
    select: {
      id:     true,
      tag:    true,
      name:   true,
      farmId: true,
    },
  },
} as const

// ─── Listagem paginada da fazenda ─────────────────────────

export async function getHealthEventsByFarm(
  farmId:  string,
  filters: Partial<HealthEventFiltersInput> = {},
): Promise<HealthEventPage> {
  const { type, animalId, resolved, page = 1 } = filters

  const where = {
    animal: { farmId },
    ...(type     && { type }),
    ...(animalId && { animalId }),
    ...(resolved !== undefined && { resolved: resolved === 'true' }),
  }

  const skip = (page - 1) * PAGE_SIZE

  const [items, total] = await Promise.all([
    prisma.healthEvent.findMany({
      where,
      select:  HEALTH_EVENT_SELECT,
      orderBy: { occurredAt: 'desc' },
      skip,
      take:    PAGE_SIZE,
    }),
    prisma.healthEvent.count({ where }),
  ])

  return {
    items:     items as HealthEventItem[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

// ─── Timeline por animal ──────────────────────────────────

export async function getHealthEventsByAnimal(
  animalId: string,
  farmId:   string,
  limit?:   number,
): Promise<HealthEventItem[]> {
  const items = await prisma.healthEvent.findMany({
    where:   { animalId, animal: { farmId } },
    select:  HEALTH_EVENT_SELECT,
    orderBy: { occurredAt: 'desc' },
    take:    limit ?? 50,
  })

  return items as HealthEventItem[]
}

// ─── Detalhe único ────────────────────────────────────────

export async function getHealthEventById(
  id:     string,
  farmId: string,
): Promise<HealthEventItem | null> {
  const item = await prisma.healthEvent.findFirst({
    where:  { id, animal: { farmId } },
    select: HEALTH_EVENT_SELECT,
  })

  return item as HealthEventItem | null
}

// ─── Contagem por tipo (para stats da fazenda) ────────────

export async function getHealthEventStats(
  farmId: string,
): Promise<{ type: string; count: number }[]> {
  const groups = await prisma.healthEvent.groupBy({
    by:    ['type'],
    where: { animal: { farmId } },
    _count: true,
    orderBy: { _count: { type: 'desc' } },
  })

  return groups.map((g) => ({ type: g.type, count: g._count }))
}
