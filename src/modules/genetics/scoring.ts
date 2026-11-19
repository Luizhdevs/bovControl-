/**
 * Algoritmo de scoring para ranking de touros.
 *
 * Fase 1 (piloto): sem DEPs de vacas → ranking global por metas da fazenda.
 * Fase 2: com DEPs de vacas → score de complementaridade por animal.
 *
 * Lógica:
 *  1. Normaliza cada DEP do touro em relação à média do catálogo (z-score → 0–100).
 *  2. Aplica os pesos definidos nas metas da fazenda.
 *  3. Retorna score final 0–100 e breakdown por grupo.
 */

import type { BullForMatch, GoalWeights, MatchResult } from './types'
import { INVERTED_TRAITS } from './types'

// ─── Normalização ─────────────────────────────────────────

function stats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) return { mean: 0, std: 1 }
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return { mean, std: Math.sqrt(variance) || 1 }
}

/** Converte valor DEP em percentil 0–100 relativo ao catálogo. */
function normalize(
  value:    number,
  mean:     number,
  std:      number,
  inverted: boolean,
): number {
  // z-score em range [-3, 3] → escalar para [0, 100]
  const z = (value - mean) / std
  const clamped = Math.max(-3, Math.min(3, z))
  const pct = ((clamped + 3) / 6) * 100
  return inverted ? 100 - pct : pct
}

// ─── Coleta de valores do catálogo para normalização ─────

type DepKey = keyof Pick<
  BullForMatch,
  'depLeite' | 'depGordura' | 'depProteina' | 'depDesmame' | 'depSobreano' |
  'depParto' | 'depCcs' | 'depTemperamento' | 'depConformacao' | 'depFertilidade'
>

const DEP_KEYS: DepKey[] = [
  'depLeite', 'depGordura', 'depProteina',
  'depDesmame', 'depSobreano',
  'depParto', 'depCcs', 'depTemperamento',
  'depConformacao', 'depFertilidade',
]

function buildCatalogStats(bulls: BullForMatch[]): Record<DepKey, { mean: number; std: number }> {
  const result = {} as Record<DepKey, { mean: number; std: number }>
  for (const key of DEP_KEYS) {
    const vals = bulls.map(b => b[key]).filter((v): v is number => v !== null && v !== undefined)
    result[key] = stats(vals)
  }
  return result
}

// ─── Score por grupo ──────────────────────────────────────

function groupScore(
  bull:    BullForMatch,
  keys:    DepKey[],
  catStats: Record<DepKey, { mean: number; std: number }>,
): number | null {
  const scores: number[] = []
  for (const key of keys) {
    const v = bull[key]
    if (v === null || v === undefined) continue
    const { mean, std } = catStats[key]
    scores.push(normalize(v, mean, std, INVERTED_TRAITS.has(key)))
  }
  if (scores.length === 0) return null
  return scores.reduce((s, v) => s + v, 0) / scores.length
}

// ─── Score final ──────────────────────────────────────────

export function rankBulls(bulls: BullForMatch[], goals: GoalWeights): MatchResult[] {
  if (bulls.length === 0) return []

  const catStats = buildCatalogStats(bulls)

  const totalWeight = goals.wLeite + goals.wGanho + goals.wParto + goals.wCcs + goals.wConformacao

  return bulls
    .map((bull): MatchResult => {
      const leite = groupScore(bull, ['depLeite', 'depGordura', 'depProteina'], catStats)
      const ganho = groupScore(bull, ['depDesmame', 'depSobreano'], catStats)
      const parto = groupScore(bull, ['depParto'], catStats)
      const ccs   = groupScore(bull, ['depCcs'], catStats)
      const conformacao = groupScore(bull, ['depConformacao'], catStats)

      let weightedSum  = 0
      let weightedTotal = 0

      const addGroup = (val: number | null, w: number) => {
        if (val === null) return
        weightedSum   += val * w
        weightedTotal += w
      }

      addGroup(leite,       goals.wLeite)
      addGroup(ganho,       goals.wGanho)
      addGroup(parto,       goals.wParto)
      addGroup(ccs,         goals.wCcs)
      addGroup(conformacao, goals.wConformacao)

      const score = weightedTotal > 0
        ? Math.round(weightedSum / weightedTotal)
        : 0

      const traitsAvailable = DEP_KEYS.filter(
        k => bull[k] !== null && bull[k] !== undefined
      ).length

      return {
        bull,
        score,
        breakdown: { leite, ganho, parto, ccs, conformacao },
        traitsAvailable,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export const DEFAULT_GOALS: GoalWeights = {
  wLeite: 30, wGanho: 25, wParto: 20, wCcs: 15, wConformacao: 10,
}
