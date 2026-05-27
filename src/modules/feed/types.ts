// ─── ActionResult (padrão compartilhado) ──────────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never; kind?: never }
  | { success: false; error: string; data?:  never; kind: 'domain' | 'network' }

// ─── FeedType ──────────────────────────────────────────────────

export type FeedTypeItem = {
  id:             string
  name:           string
  brand:          string | null
  weightPerBagKg: number
  pricePerBag:    number
  proteinPercent: number | null
  active:         boolean
  createdAt:      Date
}

// ─── FeedSession ───────────────────────────────────────────────

export type FeedSessionItem = {
  id:                   string
  date:                 Date
  bagCount:             int
  totalWeightKg:        number
  totalCost:            number
  animalCount:          int
  averageKgPerAnimal:   number
  averageCostPerAnimal: number
  notes:                string | null
  createdAt:            Date
  lot: {
    id:   string
    name: string
    type: string
  }
  feedType: {
    id:             string
    name:           string
    brand:          string | null
    weightPerBagKg: number
    pricePerBag:    number
  }
}

// ─── Stats de ração ────────────────────────────────────────────

export type FeedDashboardData = {
  todayKg:         number
  todayCost:       number
  weeklyKg:        number
  weeklyCost:      number
  costPerLiter:    number | null   // null se sem produção de leite no período
  topLot:          { name: string; kg: number } | null
  avgKgPerAnimal:  number          // média ponderada da semana
}

export type FeedStats = {
  periodKg:    number
  periodCost:  number
  sessionCount: number
  avgKgPerSession: number
}

// Ajuda o TypeScript a aceitar Int como number
type int = number
