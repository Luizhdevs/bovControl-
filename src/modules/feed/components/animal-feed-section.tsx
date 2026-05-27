import { Wheat, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type FeedEntry = {
  id:            string
  consumedKg:    number
  estimatedCost: number
  createdAt:     Date
  feedSession: {
    id:            string
    date:          Date
    totalWeightKg: number
    animalCount:   number
    lot:      { name: string }
    feedType: { name: string; brand: string | null }
  }
}

interface AnimalFeedSectionProps {
  totalFeedConsumedKg: number
  estimatedFeedCost:   number
  recentHistory:       FeedEntry[]
}

export function AnimalFeedSection({
  totalFeedConsumedKg,
  estimatedFeedCost,
  recentHistory,
}: AnimalFeedSectionProps) {
  if (totalFeedConsumedKg === 0 && recentHistory.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 gap-2 text-center">
        <div className="size-10 rounded-xl bg-muted flex items-center justify-center">
          <Wheat className="size-5 text-muted-foreground/50" />
        </div>
        <p className="text-sm text-muted-foreground">Sem registros nutricionais ainda</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Acumuladores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Wheat className="size-3.5 text-amber-500" />
            <p className="text-xs text-muted-foreground">Total consumido</p>
          </div>
          <p className="text-xl font-bold tabular-nums">{totalFeedConsumedKg.toFixed(1)} kg</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="size-3.5 text-green-500" />
            <p className="text-xs text-muted-foreground">Custo estimado</p>
          </div>
          <p className="text-xl font-bold tabular-nums">{formatCurrency(estimatedFeedCost)}</p>
        </div>
      </div>

      {/* Histórico recente */}
      {recentHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Últimas alimentações</p>
          <div className="divide-y divide-border/50">
            {recentHistory.map((entry) => (
              <div key={entry.id} className="py-2.5 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">
                      {entry.feedSession.feedType.name}
                      {entry.feedSession.feedType.brand
                        ? ` · ${entry.feedSession.feedType.brand}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {entry.feedSession.lot.name} · {formatDate(entry.feedSession.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums">{entry.consumedKg.toFixed(2)} kg</p>
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      {formatCurrency(entry.estimatedCost)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
