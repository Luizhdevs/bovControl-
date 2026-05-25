import type { UserRole } from '@prisma/client'
import { prisma } from './prisma'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER:   4,
  MANAGER: 3,
  WORKER:  2,
  VIEWER:  1,
}

/**
 * Retorna o role do usuário na fazenda.
 * Retorna null se o usuário não tem acesso à fazenda.
 */
export async function getUserFarmRole(
  userId: string,
  farmId: string,
): Promise<UserRole | null> {
  const farmUser = await prisma.farmUser.findUnique({
    where:  { farmId_userId: { farmId, userId } },
    select: { role: true },
  })
  return farmUser?.role ?? null
}

/**
 * Verifica se o usuário tem acesso mínimo à fazenda.
 * Lança erro se não autorizado.
 * Retorna o role atual do usuário.
 */
export async function requireFarmAccess(
  userId: string,
  farmId: string,
  minimumRole: UserRole = 'VIEWER',
): Promise<UserRole> {
  const role = await getUserFarmRole(userId, farmId)

  if (!role || ROLE_HIERARCHY[role] < ROLE_HIERARCHY[minimumRole]) {
    throw new Error('Acesso negado')
  }

  return role
}

/**
 * Verifica acesso sem lançar erro.
 * Útil para renderização condicional em Server Components.
 */
export async function canAccess(
  userId: string,
  farmId: string,
  minimumRole: UserRole,
): Promise<boolean> {
  try {
    await requireFarmAccess(userId, farmId, minimumRole)
    return true
  } catch {
    return false
  }
}
