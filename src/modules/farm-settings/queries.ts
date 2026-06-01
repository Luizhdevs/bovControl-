import { prisma } from '@/lib/prisma'
import type { FarmSettings } from '@prisma/client'

export type FarmSettingsWithLot = FarmSettings & {
  mainProductionLot: { id: string; name: string; type: string } | null
}

// Retorna as settings da fazenda, criando com defaults se ainda não existirem.
export async function getOrCreateFarmSettings(farmId: string): Promise<FarmSettingsWithLot> {
  const existing = await prisma.farmSettings.findUnique({
    where:   { farmId },
    include: { mainProductionLot: { select: { id: true, name: true, type: true } } },
  })
  if (existing) return existing

  return prisma.farmSettings.create({
    data:    { farmId },
    include: { mainProductionLot: { select: { id: true, name: true, type: true } } },
  })
}

export async function getFarmSettings(farmId: string): Promise<FarmSettingsWithLot | null> {
  return prisma.farmSettings.findUnique({
    where:   { farmId },
    include: { mainProductionLot: { select: { id: true, name: true, type: true } } },
  })
}
