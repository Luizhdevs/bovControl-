import { prisma } from '@/lib/prisma'
import type { UserRole } from '@prisma/client'

export type FarmOption = {
  farmId: string
  role:   UserRole
  farm:   { id: string; name: string; city: string | null; state: string }
}

export async function getUserFarms(userId: string): Promise<FarmOption[]> {
  return prisma.farmUser.findMany({
    where:   { userId },
    select:  {
      farmId: true,
      role:   true,
      farm:   { select: { id: true, name: true, city: true, state: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })
}
