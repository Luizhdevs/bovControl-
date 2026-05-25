import { cn }                from '@/lib/utils'
import type { CapacityStatus } from '../types'

// ─── Helper de domínio ─────────────────────────────────────

/**
 * Calcula o status de capacidade do lote.
 *
 * Thresholds:
 *   unknown → sem capacidade informada
 *   normal  → < 70%
 *   warning → 70% – 89%
 *   full    → ≥ 90%
 */
export function getCapacityStatus(
  count:       number,
  maxCapacity: number | null,
): CapacityStatus {
  if (maxCapacity === null || maxCapacity === 0) return 'unknown'
  const ratio = count / maxCapacity
  if (ratio >= 0.9) return 'full'
  if (ratio >= 0.7) return 'warning'
  return 'normal'
}

// ─── Paleta de cores ───────────────────────────────────────

const BAR_COLOR: Record<CapacityStatus, string> = {
  unknown: 'bg-muted-foreground/30',
  normal:  'bg-emerald-500',
  warning: 'bg-amber-500',
  full:    'bg-red-500',
}

const STATUS_LABEL: Record<CapacityStatus, string> = {
  unknown: '',
  normal:  '',
  warning: 'atenção',
  full:    'lotado',
}

const STATUS_COLOR: Record<CapacityStatus, string> = {
  unknown: '',
  normal:  '',
  warning: 'text-amber-400',
  full:    'text-red-400',
}

// ─── Variante compacta (para cards) ───────────────────────

interface LotCapacityIndicatorProps {
  count:       number
  maxCapacity: number | null
  className?:  string
  /**
   * 'bar' (padrão) — barra de progresso + texto
   * 'badge'        — só o texto de status (para espaços menores)
   */
  variant?: 'bar' | 'badge'
}

export function LotCapacityIndicator({
  count,
  maxCapacity,
  className,
  variant = 'bar',
}: LotCapacityIndicatorProps) {
  const status = getCapacityStatus(count, maxCapacity)

  if (variant === 'badge') {
    if (status === 'unknown' || status === 'normal') {
      return (
        <span className={cn('text-xs text-muted-foreground', className)}>
          {count} animais
        </span>
      )
    }
    return (
      <span className={cn('text-xs font-medium', STATUS_COLOR[status], className)}>
        {count}{maxCapacity ? `/${maxCapacity}` : ''} · {STATUS_LABEL[status]}
      </span>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Texto acima da barra */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {count}{maxCapacity ? `/${maxCapacity}` : ' animais'}
        </span>
        {STATUS_LABEL[status] && (
          <span className={cn('text-xs font-medium', STATUS_COLOR[status])}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      {maxCapacity ? (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-300', BAR_COLOR[status])}
            style={{ width: `${Math.min((count / maxCapacity) * 100, 100)}%` }}
          />
        </div>
      ) : (
        // Sem capacidade definida — linha tracejada indicativa
        <div className="h-1.5 bg-muted/50 rounded-full border border-dashed border-muted-foreground/20" />
      )}
    </div>
  )
}
