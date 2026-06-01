'server-only'

import { prisma }          from '@/lib/prisma'
import type { AuditLogFilters, AuditLogItem, AuditLogPage } from './types'

// ─── Constantes ────────────────────────────────────────────

const PAGE_SIZE = 50

// ─── Helpers internos ──────────────────────────────────────

function resolvePeriod(period?: string): { gte: Date } | undefined {
  if (!period) return undefined
  const now  = new Date()
  const from = new Date(now)
  if (period === 'today') {
    from.setHours(0, 0, 0, 0)
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    from.setDate(from.getDate() - days)
  }
  return { gte: from }
}

type RawLog = Awaited<ReturnType<typeof prisma.auditLog.findFirst>> & {}

async function enrichWithUsers(logs: NonNullable<RawLog>[]): Promise<AuditLogItem[]> {
  if (logs.length === 0) return []

  const ids    = [...new Set(logs.map((l) => l.userId))]
  const users  = await prisma.user.findMany({
    where:  { id: { in: ids } },
    select: { id: true, name: true, email: true },
  })
  const map = new Map(users.map((u) => [u.id, u]))

  return logs.map((log) => ({
    id:        log.id,
    farmId:    log.farmId,
    userId:    log.userId,
    action:    log.action,
    entity:    log.entity,
    entityId:  log.entityId,
    before:    log.before,
    after:     log.after,
    metadata:  log.metadata,
    createdAt: log.createdAt,
    user:      map.get(log.userId) ?? { id: log.userId, name: 'Usuário removido', email: '' },
  }))
}

function buildWhere(farmId: string, filters: AuditLogFilters) {
  const period = resolvePeriod(filters.period)
  return {
    farmId,
    ...(filters.entity && { entity: filters.entity }),
    ...(filters.action && { action: filters.action }),
    ...(filters.userId && { userId: filters.userId }),
    ...(period         && { createdAt: period }),
  }
}

// ─── Queries públicas ──────────────────────────────────────

export async function getAuditLogs(
  farmId:  string,
  filters: AuditLogFilters = {},
  page     = 1,
  pageSize = PAGE_SIZE,
): Promise<AuditLogPage> {
  const where = buildWhere(farmId, filters)
  const skip  = (page - 1) * pageSize

  const [rawLogs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
    prisma.auditLog.count({ where }),
  ])

  const items = await enrichWithUsers(rawLogs)

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

/** Últimas N ações da fazenda — para o card de atividade recente em /settings. */
export async function getRecentActivity(
  farmId: string,
  limit   = 20,
): Promise<AuditLogItem[]> {
  const rawLogs = await prisma.auditLog.findMany({
    where:   { farmId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  return enrichWithUsers(rawLogs)
}

/** Histórico de uma entidade específica — para /animals/[id] e /lots/[id]. */
export async function getEntityHistory(
  entityId: string,
  farmId:   string,
  limit     = 30,
): Promise<AuditLogItem[]> {
  const rawLogs = await prisma.auditLog.findMany({
    where:   { entityId, farmId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
  })
  return enrichWithUsers(rawLogs)
}

/** Lista de usuários que geraram ao menos um log na fazenda — para o filtro de usuário. */
export async function getAuditLogUsers(
  farmId: string,
): Promise<{ id: string; name: string }[]> {
  const distinct = await prisma.auditLog.findMany({
    where:    { farmId },
    select:   { userId: true },
    distinct: ['userId'],
  })
  if (distinct.length === 0) return []

  return prisma.user.findMany({
    where:   { id: { in: distinct.map((d) => d.userId) } },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}
