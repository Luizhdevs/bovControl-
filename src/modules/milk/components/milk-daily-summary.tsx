import { cn, formatLiters } from '@/lib/utils'
import { MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'
import { SHIFT_EMOJIS, SHIFT_TEXT_COLORS } from '../constants'
import type { DailyMilkSummary } from '../types'

// ─── Componente ────────────────────────────────────────────

interface MilkDailySummaryProps {
  summary:    DailyMilkSummary
  className?: string
}

export function MilkDailySummary({ summary, className }: MilkDailySummaryProps) {
  const shifts = ['MORNING', 'AFTERNOON'] as const

  return (
    <div className={cn('space-y-4', className)}>

      {/* Destaque: total do dia */}
      <div className="text-center py-2">
        <div className="text-5xl font-bold tabular-nums text-cyan-400 leading-none">
          {formatLiters(summary.totalLiters)}
        </div>
        <div className="text-xs text-muted-foreground">
          {summary.animalCount}{' '}
          {summary.animalCount === 1 ? 'animal ordenhado' : 'animais ordenhados'}
        </div>
      </div>

      {/* Por turno */}
      <div className="grid grid-cols-2 gap-2">
        {shifts.map((shift) => {
          const liters = summary.byShift[shift]
          const pct    = summary.totalLiters > 0
            ? (liters / summary.totalLiters) * 100
            : 0

          return (
            <div
              key={shift}
              className="rounded-xl border border-border bg-card/50 p-3 text-center space-y-1"
            >
              <div className="text-xl leading-none">{SHIFT_EMOJIS[shift]}</div>
              <div className={cn('text-sm font-bold tabular-nums', SHIFT_TEXT_COLORS[shift])}>
                {formatLiters(liters)}
              </div>
              <div className="text-[10px] text-muted-foreground leading-none">
                {MILK_SHIFT_LABELS[shift]}
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                <div
                  className="h-full rounded-full bg-current opacity-60 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
