import { prisma } from '@/lib/prisma'
import type { AlertWithAnimal, AlertFilters } from './types'

// ─── Lista de alertas ─────────────────────────────────────

export async function getAlerts(
  farmId:  string,
  filters: AlertFilters = {},
): Promise<AlertWithAnimal[]> {
  const rows = await prisma.alert.findMany({
    where: {
      farmId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type   ? { type:   filters.type   } : {}),
    },
    include: {
      animal: { select: { id: true, tag: true, name: true } },
    },
    orderBy: [
      { priority: 'asc' }, // enum order: HIGH → MEDIUM → LOW (PostgreSQL enum declaration order)
      { dueDate:  'asc' }, // mais urgente primeiro (nulls last por padrão)
      { createdAt: 'desc' },
    ],
    take: 200,
  })

  return rows as AlertWithAnimal[]
}

// ─── Contagem de alertas pendentes (badge nav) ─────────────

export async function getPendingAlertCount(farmId: string): Promise<number> {
  return prisma.alert.count({
    where: { farmId, status: 'PENDING' },
  })
}
