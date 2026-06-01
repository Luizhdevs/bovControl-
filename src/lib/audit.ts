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

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'DEACTIVATE'
  | 'ACTIVATE'
  | 'SOFT_DELETE'
  | 'EXPORT'

/** Origem da ação: interface web, fila offline ou SyncProvider. */
export type AuditSource = 'web' | 'offline' | 'sync'

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

// ─── Helpers tipados por ação ──────────────────────────────

type AuditEntryWithoutAction = Omit<AuditEntry, 'action'>

export function auditCreate(entry: AuditEntryWithoutAction):     void { auditLog({ ...entry, action: 'CREATE'     }) }
export function auditUpdate(entry: AuditEntryWithoutAction):     void { auditLog({ ...entry, action: 'UPDATE'     }) }
export function auditDelete(entry: AuditEntryWithoutAction):     void { auditLog({ ...entry, action: 'DELETE'     }) }
export function auditDeactivate(entry: AuditEntryWithoutAction): void { auditLog({ ...entry, action: 'DEACTIVATE' }) }
