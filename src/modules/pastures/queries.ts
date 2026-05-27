import { prisma } from '@/lib/prisma'
import type { PastureListItem, PastureWithLots } from './types'

// ─── Listagem de pastos ───────────────────────────────────

/**
 * Retorna pastos com contagem de lotes e animais ativos.
 * 2 queries paralelas: pastos + contagem de animais por pasto (via lotes).
 */
export async function getPasturesByFarm(farmId: string): Promise<PastureListItem[]> {
  const [pastures, lotsWithCounts] = await Promise.all([
    prisma.pasture.findMany({
      where:   { farmId },
      select: {
        id:           true,
        name:         true,
        areaHectares: true,
        grassType:    true,
        maxCapacity:  true,
        isActive:     true,
        _count:       { select: { lots: true } },
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    }),

    // Agrega animais ativos por pasto via lotes
    prisma.lot.findMany({
      where:  { farmId, pastureId: { not: null } },
      select: {
        pastureId: true,
        _count:    { select: { animals: { where: { status: 'ACTIVE' } } } },
      },
    }),
  ])

  // Mapeia soma de animais por pastureId
  const animalsByPasture = new Map<string, number>()
  for (const lot of lotsWithCounts) {
    if (!lot.pastureId) continue
    animalsByPasture.set(
      lot.pastureId,
      (animalsByPasture.get(lot.pastureId) ?? 0) + lot._count.animals,
    )
  }

  return pastures.map((p) => ({
    ...p,
    animalCount: animalsByPasture.get(p.id) ?? 0,
  }))
}

// ─── Detalhes do pasto ────────────────────────────────────

export async function getPastureById(
  id:     string,
  farmId: string,
): Promise<PastureWithLots | null> {
  const pasture = await prisma.pasture.findFirst({
    where:  { id, farmId },
    select: {
      id:           true,
      name:         true,
      areaHectares: true,
      grassType:    true,
      maxCapacity:  true,
      isActive:     true,
      _count:       { select: { lots: true } },
      lots: {
        select: {
          id:     true,
          name:   true,
          type:   true,
          _count: { select: { animals: { where: { status: 'ACTIVE' } } } },
        },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!pasture) return null

  const animalCount = pasture.lots.reduce((s, l) => s + l._count.animals, 0)

  return { ...pasture, animalCount }
}
