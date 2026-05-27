// Proteína: faixas para badge de qualidade
export const PROTEIN_TIERS = [
  { min: 20, label: 'Alto',  color: 'bg-green-500/15 text-green-400'  },
  { min: 14, label: 'Médio', color: 'bg-amber-500/15 text-amber-400'  },
  { min:  0, label: 'Baixo', color: 'bg-muted text-muted-foreground'  },
] as const

export function getProteinLabel(pct: number | null) {
  if (pct == null) return null
  return PROTEIN_TIERS.find((t) => pct >= t.min) ?? PROTEIN_TIERS[PROTEIN_TIERS.length - 1]!
}
