import type { MilkRecord, Animal } from '@prisma/client'

// ─── Registro individual ───────────────────────────────────

export type MilkRecordWithAnimal = MilkRecord & {
  animal: Pick<Animal, 'id' | 'tag' | 'name' | 'category'>
}

// ─── Resumo por animal ─────────────────────────────────────

export type AnimalMilkSummary = {
  animalId:  string
  tag:       string
  name:      string | null
  totalDay:  number       // Litros no dia
  records:   MilkRecord[]
}

// ─── Resumo diário da fazenda ──────────────────────────────

export type DailyMilkSummary = {
  date:         Date
  totalLiters:  number
  animalCount:  number
  byShift: {
    MORNING:   number
    AFTERNOON: number
    EVENING:   number
  }
  topAnimals:   AnimalMilkSummary[]
}

// ─── Animal elegível para registro de leite ───────────────
// Usado no formulário de registro e na listagem rápida

export type AnimalForMilk = {
  id:       string
  tag:      string
  name:     string | null
  category: string
  lot:      { id: string; name: string } | null
}

// ─── Histórico diário (para gráfico) ──────────────────────

export type DailyProduction = {
  date:   string  // 'YYYY-MM-DD'
  liters: number
}

// ─── ActionResult (mesmo padrão dos outros módulos) ────────

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never }
  | { success: false; error: string; data?:  never }
