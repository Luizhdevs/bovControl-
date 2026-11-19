import { prisma }      from '@/lib/prisma'
import { rankBulls, DEFAULT_GOALS } from './scoring'
import type { BullForMatch, GoalWeights, MatchResult } from './types'

const BULL_SELECT = {
  id: true, bullName: true, externalCode: true, race: true, labName: true,
  depLeite: true, depGordura: true, depProteina: true,
  depDesmame: true, depSobreano: true,
  depParto: true, depCcs: true, depTemperamento: true,
  depConformacao: true, depFertilidade: true,
  accLeite: true, accDesmame: true,
  active: true, notes: true,
} as const

export async function getBullCatalog(farmId: string): Promise<BullForMatch[]> {
  return prisma.geneticProfile.findMany({
    where:   { farmId, active: true },
    select:  BULL_SELECT,
    orderBy: { bullName: 'asc' },
  })
}

export async function getBullById(farmId: string, id: string): Promise<BullForMatch | null> {
  return prisma.geneticProfile.findFirst({
    where:  { id, farmId },
    select: BULL_SELECT,
  })
}

export async function getFarmBreedingGoal(farmId: string): Promise<GoalWeights> {
  const goal = await prisma.farmBreedingGoal.findUnique({
    where:  { farmId },
    select: { wLeite: true, wGanho: true, wParto: true, wCcs: true, wConformacao: true },
  })
  return goal ?? DEFAULT_GOALS
}

export async function getMatchResults(farmId: string): Promise<MatchResult[]> {
  const [bulls, goals] = await Promise.all([
    getBullCatalog(farmId),
    getFarmBreedingGoal(farmId),
  ])
  return rankBulls(bulls, goals)
}

export async function getCatalogStats(farmId: string) {
  const count = await prisma.geneticProfile.count({ where: { farmId, active: true } })
  return { count }
}
