import type {
  Animal,
  AnimalPhoto,
  Lot,
  WeightRecord,
  Reproduction,
} from '@prisma/client'

// ─── Animal na listagem (projetado — sem dados pesados) ────

export type AnimalListItem = {
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

// ─── Animal completo com relações ─────────────────────────

export type AnimalWithRelations = Animal & {
  lot:    Lot | null
  mother: Pick<Animal, 'id' | 'tag' | 'name'> | null
  father: Pick<Animal, 'id' | 'tag' | 'name'> | null
  photos: AnimalPhoto[]
  weightRecords: WeightRecord[]
  reproductions: Reproduction[]
  _count: {
    milkRecords:  number
    healthEvents: number
    photos:       number
  }
}

// ─── Opção de seleção (combobox de pai/mãe) ───────────────

export type AnimalSelectOption = {
  id:       string
  tag:      string
  name:     string | null
  sex:      Animal['sex']
  category: Animal['category']
}

// ─── Opção de seleção de lote ─────────────────────────────

export type LotSelectOption = {
  id:          string
  name:        string
  type:        Lot['type']
  _count:      { animals: number }
  maxCapacity: number | null
}

// ─── Estatísticas do dashboard ────────────────────────────

export type AnimalStats = {
  total:   number
  cows:    number
  heifers: number
  calves:  number
  bulls:   number
  steers:  number
}

// ─── Resultado padrão das Server Actions ──────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never }
  | { success: false; error: string; data?:  never }
