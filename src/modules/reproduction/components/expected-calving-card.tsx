import { differenceInDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface ExpectedCalvingCardProps {
  expectedCalvingDate: Date
  confirmedAt:         Date
  className?:          string
}

export function ExpectedCalvingCard({
  expectedCalvingDate,
  confirmedAt,
  className,
}: ExpectedCalvingCardProps) {
  const today           = new Date()
  const daysUntilCalving = differenceInDays(expectedCalvingDate, today)
  const totalGestDays   = differenceInDays(today, confirmedAt)

  const isOverdue  = daysUntilCalving < 0
  const isImminent = daysUntilCalving >= 0 && daysUntilCalving <= 14

  const urgencyClass = isOverdue
    ? 'border-red-500/40 bg-red-500/5'
    : isImminent
      ? 'border-amber-500/40 bg-amber-500/5'
      : 'border-emerald-500/20 bg-emerald-500/5'

  const daysLabel = isOverdue
    ? `${Math.abs(daysUntilCalving)} dias em atraso`
    : daysUntilCalving === 0
      ? 'Hoje!'
      : `${daysUntilCalving} dias`

  return (
    <div className={cn('rounded-xl border p-4 space-y-2', urgencyClass, className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Parto previsto
        </span>
        {isOverdue && (
          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-medium">
            ATRASADO
          </span>
        )}
        {isImminent && !isOverdue && (
          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-medium">
            IMINENTE
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums text-foreground">
          {daysLabel}
        </span>
      </div>

      <div className="text-xs text-muted-foreground">
        {format(expectedCalvingDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
      </div>

      {/* Barra de progresso da gestação */}
      <div className="space-y-1 pt-1">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isOverdue ? 'bg-red-500' : isImminent ? 'bg-amber-500' : 'bg-emerald-500',
            )}
            style={{ width: `${Math.min(100, Math.max(0, (totalGestDays / 280) * 100))}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground">
          {totalGestDays} dias de gestação (de 280 estimados)
        </div>
      </div>
    </div>
  )
}
