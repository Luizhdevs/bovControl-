import type { Reproduction, Animal } from '@prisma/client'

// ─── Registro individual com animal ───────────────────────

export type ReproductionWithAnimal = Reproduction & {
  animal: Pick<Animal, 'id' | 'tag' | 'name' | 'category' | 'sex'>
}

// ─── Animal elegível para reprodução ──────────────────────

export type AnimalForReproduction = {
  id:       string
  tag:      string
  name:     string | null
  category: string
  lot:      { id: string; name: string } | null
}

// ─── Status de prenhez derivado dos registros ─────────────

export type PregnancyStatus = 'pregnant' | 'not_pregnant' | 'unknown'

// ─── Resumo reprodutivo de um animal ──────────────────────

export type AnimalReproductionSummary = {
  animal:              AnimalForReproduction & { sex: string; status: string }
  pregnancyStatus:     PregnancyStatus
  lastCheckDate:       Date | null       // Data do último PREGNANCY_CHECK
  expectedCalvingDate: Date | null       // nextCheckDate quando prenha confirmada
  lastInseminationDate: Date | null      // Data da última inseminação/monta
  totalEvents:         number
}

// ─── Parto previsto (para dashboard) ──────────────────────

export type UpcomingCalving = {
  animalId:            string
  tag:                 string
  name:                string | null
  expectedCalvingDate: Date
  daysUntilCalving:    number
  confirmedAt:         Date
}

// ─── ActionResult (padrão dos módulos) ────────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never }
  | { success: false; error: string; data?:  never }
