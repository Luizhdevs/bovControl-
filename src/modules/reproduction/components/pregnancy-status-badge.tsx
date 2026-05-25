import { cn } from '@/lib/utils'
import type { PregnancyStatus } from '../types'

const PREGNANCY_CONFIG: Record<
  PregnancyStatus,
  { label: string; className: string }
> = {
  pregnant:     { label: '🤰 Prenha',       className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  not_pregnant: { label: '✗ Não prenha',    className: 'bg-red-500/10 text-red-400 border-red-500/20' },
  unknown:      { label: '? Não verificada', className: 'bg-muted text-muted-foreground border-border' },
}

interface PregnancyStatusBadgeProps {
  status:    PregnancyStatus
  className?: string
}

export function PregnancyStatusBadge({ status, className }: PregnancyStatusBadgeProps) {
  const config = PREGNANCY_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
