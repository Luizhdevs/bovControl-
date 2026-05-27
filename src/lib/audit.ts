'server-only'

/**
 * Criação de entradas de auditoria.
 *
 * Estratégia: fire-and-forget — falhas de auditoria nunca bloqueiam
 * a operação principal. Erros são logados mas não propagados.
 *
 * Modelo append-only: entradas NUNCA são deletadas.
 */

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { Prisma } from '@prisma/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

interface AuditEntry {
  farmId:    string
  userId:    string
  action:    AuditAction
  entity:    string
  entityId:  string
  before?:   Prisma.InputJsonValue
  after?:    Prisma.InputJsonValue
  metadata?: Prisma.InputJsonValue
}

/**
 * Registra uma ação de auditoria de forma assíncrona (fire-and-forget).
 * Chame sem await em actions — não deve bloquear a resposta.
 */
export function auditLog(entry: AuditEntry): void {
  prisma.auditLog.create({ data: entry })
    .catch((e) => logger.error('[audit] failed to write entry', {
      entity:   entry.entity,
      entityId: entry.entityId,
      action:   entry.action,
      error:    e instanceof Error ? e.message : String(e),
    }))
}
