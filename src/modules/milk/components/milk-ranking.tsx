/**
 * MilkRanking — top produtoras por animal.
 * Desabilitado com a migração para MilkingSession (Sprint 5).
 * Mantido para a Fase 2 (rastreabilidade individual por vaca).
 */

// @ts-nocheck — arquivo desabilitado, ignorado pelo type-checker


// ─── Constantes ────────────────────────────────────────────

const PODIUM_STYLES = [
  'bg-amber-400/20 text-amber-400',
  'bg-zinc-400/20 text-zinc-300',
  'bg-orange-700/20 text-orange-500',
]

// ─── Componente ────────────────────────────────────────────

interface MilkRankingProps {
  topAnimals: AnimalMilkSummary[]
  className?: string
}

export function MilkRanking({ topAnimals, className }: MilkRankingProps) {
  if (topAnimals.length === 0) return null

  const max = topAnimals[0]?.totalDay ?? 1

  return (
    <div className={cn('space-y-0.5', className)}>
      {topAnimals.map((animal, index) => (
        <Link
          key={animal.animalId}
          href={`/milk/${animal.animalId}`}
          className="flex items-center gap-3 px-1 py-2.5 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors"
        >
          <span
            className={cn(
              'size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              PODIUM_STYLES[index] ?? 'text-muted-foreground',
            )}
          >
            {index + 1}
          </span>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-sm font-bold text-foreground">
                {animal.tag}
              </span>
              {animal.name && (
                <span className="text-xs text-muted-foreground truncate">
                  · {animal.name}
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${Math.round((animal.totalDay / max) * 100)}%` }}
              />
            </div>
          </div>

          <span className="text-sm font-bold text-cyan-400 shrink-0 tabular-nums">
            {formatLiters(animal.totalDay)}
          </span>
        </Link>
      ))}
    </div>
  )
}
