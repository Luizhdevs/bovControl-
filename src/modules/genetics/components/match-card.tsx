import { DepBar } from './dep-bar'
import type { MatchResult, GoalWeights } from '../types'

interface MatchCardProps {
  result: MatchResult
  rank:   number
  goals:  GoalWeights
}

export function MatchCard({ result, rank, goals }: MatchCardProps) {
  const { bull, score, breakdown, traitsAvailable } = result

  const scoreColor =
    score >= 75 ? 'text-emerald-400' :
    score >= 55 ? 'text-amber-400'   :
                  'text-muted-foreground'

  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {medal && <span className="text-base">{medal}</span>}
            <span className="font-semibold text-sm leading-tight">{bull.bullName}</span>
            {bull.externalCode && (
              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                {bull.externalCode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {bull.race && <span className="text-xs text-muted-foreground">{bull.race}</span>}
            {bull.labName && <span className="text-xs text-muted-foreground">· {bull.labName}</span>}
            <span className="text-[10px] text-muted-foreground">
              {traitsAvailable} DEP{traitsAvailable !== 1 ? 's' : ''} cadastrada{traitsAvailable !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{score}</div>
          <div className="text-[10px] text-muted-foreground">/ 100</div>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-400' : 'bg-muted-foreground'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Breakdown por grupo */}
      <div className="space-y-0.5 pt-1">
        <DepBar
          label="Leite / componentes"
          value={bull.depLeite}
          score={breakdown.leite}
          unit="kg"
          weight={goals.wLeite}
        />
        <DepBar
          label="Crescimento"
          value={bull.depDesmame}
          score={breakdown.ganho}
          unit="kg desm."
          weight={goals.wGanho}
        />
        <DepBar
          label="Facilidade parto"
          value={bull.depParto}
          score={breakdown.parto}
          unit="%"
          inverted
          weight={goals.wParto}
        />
        <DepBar
          label="CCS (úbere)"
          value={bull.depCcs}
          score={breakdown.ccs}
          unit="×1k"
          inverted
          weight={goals.wCcs}
        />
        <DepBar
          label="Conformação"
          value={bull.depConformacao}
          score={breakdown.conformacao}
          weight={goals.wConformacao}
        />
      </div>

      {/* Acurácia */}
      {(bull.accLeite !== null && bull.accLeite !== undefined) && (
        <div className="pt-1 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground">
            Acurácia leite: {Math.round((bull.accLeite ?? 0) * 100)}%
            {bull.accDesmame !== null && bull.accDesmame !== undefined && (
              <> · crescimento: {Math.round((bull.accDesmame ?? 0) * 100)}%</>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
