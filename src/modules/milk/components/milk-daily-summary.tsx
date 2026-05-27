import { cn, formatLiters } from '@/lib/utils'
import { MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'
import { SHIFT_EMOJIS, SHIFT_TEXT_COLORS, SHIFT_COLORS } from '../constants'
import type { DailyMilkSummary } from '../types'

// ─── Componente ────────────────────────────────────────────────

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
        <div className="text-xs text-muted-foreground mt-1 space-x-2">
          {summary.totalCows > 0 && (
            <span>{summary.totalCows} vacas</span>
          )}
          {summary.avgPerCow > 0 && (
            <span>· {summary.avgPerCow.toFixed(1)} L/vaca</span>
          )}
        </div>
      </div>

      {/* Por turno */}
      <div className="grid grid-cols-2 gap-2">
        {shifts.map((shift) => {
          const s         = shift === 'MORNING' ? summary.morning : summary.afternoon
          const liters    = s?.totalLiters ?? 0
          const cows      = s?.milkingCows ?? 0
          const avg       = s?.avgPerCow   ?? 0
          const pct       = summary.totalLiters > 0 ? (liters / summary.totalLiters) * 100 : 0
          const hasData   = liters > 0

          return (
            <div
              key={shift}
              className={cn(
                'rounded-xl border p-3 text-center space-y-1 transition-colors',
                hasData
                  ? 'bg-card/50 border-border'
                  : 'bg-card/20 border-border/30 opacity-50',
              )}
            >
              <div className="text-xl leading-none">{SHIFT_EMOJIS[shift]}</div>
              <div className={cn('text-sm font-bold tabular-nums', SHIFT_TEXT_COLORS[shift])}>
                {hasData ? formatLiters(liters) : '—'}
              </div>
              <div className="text-[10px] text-muted-foreground leading-none">
                {MILK_SHIFT_LABELS[shift]}
              </div>
              {hasData && cows > 0 && (
                <div className="text-[10px] text-muted-foreground leading-none">
                  {cows} vacas · {avg.toFixed(1)} L
                </div>
              )}
              <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
                <div
                  className={cn('h-full rounded-full opacity-60 transition-all', SHIFT_TEXT_COLORS[shift])}
                  style={{ width: `${pct}%`, backgroundColor: 'currentColor' }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
