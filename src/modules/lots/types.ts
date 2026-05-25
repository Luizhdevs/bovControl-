import type { Lot, Pasture, Animal, AnimalPhoto } from '@prisma/client'

// ─── Lote na listagem ──────────────────────────────────────

export type LotListItem = {
  id:          string
  name:        string
  type:        Lot['type']
  maxCapacity: number | null
  isActive:    boolean
  pasture:     Pick<Pasture, 'id' | 'name'> | null
  stats:       LotStats
}

// ─── Estatísticas do lote ──────────────────────────────────

export type LotStats = {
  total:   number
  cows:    number
  heifers: number
  calves:  number
  bulls:   number
  steers:  number
  males:   number
  females: number
}

// ─── Status de capacidade (para indicador visual) ──────────

export type CapacityStatus = 'unknown' | 'normal' | 'warning' | 'full'

// ─── Animal dentro do lote (listagem interna) ──────────────
// Compatível com AnimalListItem do módulo animals para reusar AnimalCard

export type AnimalInLot = {
  id:           string
  tag:          string
  name:         string | null
  sex:          Animal['sex']
  category:     Animal['category']
  status:       Animal['status']
  purpose:      Animal['purpose']
  breed:        string
  birthDate:    Date | null
  lot:          Pick<Lot, 'id' | 'name' | 'type'> | null
  primaryPhoto: Pick<AnimalPhoto, 'url'> | null
  _count:       { photos: number }
}

// ─── Lote completo com relações ────────────────────────────

export type LotWithDetails = Lot & {
  observations: string | null
  pasture:      Pick<Pasture, 'id' | 'name' | 'areaHectares' | 'grassType'> | null
  animals:      AnimalInLot[]
  stats:        LotStats
}

// ─── Seleção de pastos (form de lote) ─────────────────────

export type PastureSelectOption = {
  id:           string
  name:         string
  areaHectares: number | null
  maxCapacity:  number | null
  _count:       { lots: number }
}

// ─── Resultado padrão das Server Actions ──────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never }
  | { success: false; error: string; data?:  never }
