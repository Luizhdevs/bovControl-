import { prisma }              from '@/lib/prisma'
import type { EarTagTemplateItem, AnimalForEarTag } from './types'

export async function getEarTagTemplates(farmId: string): Promise<EarTagTemplateItem[]> {
  return prisma.earTagTemplate.findMany({
    where:   { farmId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getEarTagTemplateById(
  id:     string,
  farmId: string,
): Promise<EarTagTemplateItem | null> {
  return prisma.earTagTemplate.findFirst({
    where: { id, farmId },
  })
}

export async function getAnimalsForEarTagPrint(farmId: string): Promise<AnimalForEarTag[]> {
  return prisma.animal.findMany({
    where:   { farmId, status: 'ACTIVE' },
    select: {
      id:       true,
      tag:      true,
      name:     true,
      category: true,
      sex:      true,
      lot:      { select: { name: true } },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
  })
}
