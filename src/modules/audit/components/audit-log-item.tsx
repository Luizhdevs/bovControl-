import { cn, formatRelativeDate, formatDateTime } from '@/lib/utils'
import {
  ENTITY_LABELS,
  ACTION_LABELS,
  ACTION_BADGE_CLASSES,
  type AuditLogItem,
} from '../types'

interface AuditLogItemRowProps {
  log:          AuditLogItem
  showUser?:    boolean
  compact?:     boolean
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function AuditLogItemRow({ log, showUser = true, compact = false }: AuditLogItemRowProps) {
  const entityLabel = ENTITY_LABELS[log.entity] ?? log.entity
  const actionLabel = ACTION_LABELS[log.action]  ?? log.action
  const badgeClass  = ACTION_BADGE_CLASSES[log.action] ?? 'bg-muted text-muted-foreground'
  const userInitials = initials(log.user.name)

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-2.5">
        {/* Avatar pequeno */}
        <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold text-muted-foreground">
          {userInitials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold', badgeClass)}>
              {actionLabel}
            </span>
            <span className="text-xs font-medium truncate">{entityLabel}</span>
          </div>
          {showUser && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {log.user.name}
            </p>
          )}
        </div>

        <span
          className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap"
          title={formatDateTime(log.createdAt)}
        >
          {formatRelativeDate(log.createdAt)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 py-3">
      {/* Avatar */}
      <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground">
        {userInitials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold', badgeClass)}>
            {actionLabel}
          </span>
          <span className="text-sm font-medium text-foreground">{entityLabel}</span>
          {showUser && (
            <span className="text-xs text-muted-foreground">por {log.user.name}</span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <code className="text-[10px] text-muted-foreground font-mono">
            {log.entityId.slice(-8)}
          </code>
          <span
            className="text-[11px] text-muted-foreground"
            title={formatDateTime(log.createdAt)}
          >
            · {formatRelativeDate(log.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
