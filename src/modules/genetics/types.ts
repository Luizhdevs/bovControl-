import type { GeneticProfile, FarmBreedingGoal } from '@prisma/client'

export type { GeneticProfile, FarmBreedingGoal }

export type BullForMatch = Pick<
  GeneticProfile,
  | 'id' | 'bullName' | 'externalCode' | 'race' | 'labName'
  | 'depLeite' | 'depGordura' | 'depProteina'
  | 'depDesmame' | 'depSobreano'
  | 'depParto' | 'depCcs' | 'depTemperamento'
  | 'depConformacao' | 'depFertilidade'
  | 'accLeite' | 'accDesmame'
  | 'active' | 'notes'
>

export interface MatchResult {
  bull:         BullForMatch
  score:        number           // 0–100
  breakdown: {
    leite:       number | null
    ganho:       number | null
    parto:       number | null
    ccs:         number | null
    conformacao: number | null
  }
  traitsAvailable: number        // quantas DEPs tem dados
}

export interface GoalWeights {
  wLeite:       number
  wGanho:       number
  wParto:       number
  wCcs:         number
  wConformacao: number
}

// Traits onde MENOR é melhor (invertemos para normalização)
export const INVERTED_TRAITS = new Set(['depParto', 'depCcs', 'depTemperamento'])

export const TRAIT_LABELS: Record<string, string> = {
  depLeite:       'Leite (kg)',
  depGordura:     'Gordura (kg)',
  depProteina:    'Proteína (kg)',
  depDesmame:     'Desmame (kg)',
  depSobreano:    'Sobreano (kg)',
  depParto:       'Facilidade parto (%)',
  depCcs:         'CCS (×1000)',
  depTemperamento:'Temperamento',
  depConformacao: 'Conformação',
  depFertilidade: 'Fertilidade (%)',
}
