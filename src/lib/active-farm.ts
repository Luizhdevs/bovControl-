import { cookies }    from 'next/headers'
import { prisma }     from './prisma'
import type { UserRole } from '@prisma/client'

export type ActiveFarm = {
  farmId: string
  role:   UserRole
  farm:   {
    id:   string
    name: string
    city: string | null
    state: string
  }
}

const FARM_COOKIE = 'active_farm_id'

const FARM_SELECT = {
  farmId: true,
  role:   true,
  farm:   { select: { id: true, name: true, city: true, state: true } },
} as const

/**
 * Retorna a fazenda ativa do usuário.
 *
 * Lê o cookie `active_farm_id` e valida que o usuário tem acesso.
 * Se o cookie não existir ou for inválido, usa a primeira fazenda por joinedAt.
 * Retorna null se o usuário não pertence a nenhuma fazenda.
 */
export async function getActiveFarm(userId: string): Promise<ActiveFarm | null> {
  const cookieStore  = await cookies()
  const cookieFarmId = cookieStore.get(FARM_COOKIE)?.value

  if (cookieFarmId) {
    const farmUser = await prisma.farmUser.findFirst({
      where:  { userId, farmId: cookieFarmId },
      select: FARM_SELECT,
    })
    if (farmUser) return farmUser
  }

  // Fallback: primeira fazenda por data de entrada
  return prisma.farmUser.findFirst({
    where:   { userId },
    select:  FARM_SELECT,
    orderBy: { joinedAt: 'asc' },
  })
}
