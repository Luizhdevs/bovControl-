'use client'

interface DepBarProps {
  label:    string
  value:    number | null | undefined
  score:    number | null   // 0–100 normalizado
  unit?:    string
  inverted?: boolean        // menor = melhor
  weight?:  number          // peso nas metas (destaca se alto)
}

export function DepBar({ label, value, score, unit, inverted, weight }: DepBarProps) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
        <span className="text-xs text-muted-foreground/50 italic">sem dado</span>
      </div>
    )
  }

  const pct  = score ?? 50
  const color =
    pct >= 70  ? 'bg-emerald-500' :
    pct >= 45  ? 'bg-amber-400'   :
                 'bg-red-400'

  const formatted = value >= 0 ? `+${value.toFixed(1)}` : value.toFixed(1)
  const display   = unit ? `${formatted} ${unit}` : formatted

  return (
    <div className="flex items-center gap-2 py-1">
      <span className={`text-xs w-32 shrink-0 ${weight && weight >= 20 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
        {label}
        {weight && weight >= 20 && (
          <span className="ml-1 text-[10px] text-primary/70">★</span>
        )}
      </span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums w-20 text-right text-muted-foreground">
        {display}
        {inverted && value < 0 && <span className="text-emerald-500 ml-1">↓</span>}
      </span>
    </div>
  )
}
