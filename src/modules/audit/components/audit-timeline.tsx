import { ClipboardList } from 'lucide-react'
import { AuditLogItemRow } from './audit-log-item'
import type { AuditLogItem } from '../types'

interface AuditTimelineProps {
  logs:      AuditLogItem[]
  showUser?: boolean
}

/**
 * Timeline compacta de logs — usada nas páginas de detalhe de entidade
 * (animais, lotes). Mostra os logs em ordem cronológica decrescente.
 */
export function AuditTimeline({ logs, showUser = false }: AuditTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <ClipboardList className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Nenhum registro de auditoria</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/40">
      {logs.map((log) => (
        <AuditLogItemRow
          key={log.id}
          log={log}
          showUser={showUser}
          compact
        />
      ))}
    </div>
  )
}
