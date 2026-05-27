import type { MilkRecord, Animal } from '@prisma/client'

// ─── Registro individual (Fase 2 — rastreabilidade por animal) ─
// MilkRecord permanece intacto na arquitetura para futura evolução.

export type MilkRecordWithAnimal = MilkRecord & {
  animal: Pick<Animal, 'id' | 'tag' | 'name' | 'category'>
}

// ─── Sessão de ordenha ─────────────────────────────────────────
// Cada sessão = 1 turno (manhã ou tarde) para toda a fazenda.

export type MilkingSessionItem = {
  id:          string
  shift:       'MORNING' | 'AFTERNOON'
  date:        Date
  totalLiters: number
  milkingCows: number
  avgPerCow:   number   // totalLiters / milkingCows (0 se milkingCows = 0)
  notes:       string | null
}

// ─── Resumo diário (baseado em sessões) ───────────────────────

export type DailyMilkSummary = {
  date:        Date
  totalLiters: number
  totalCows:   number   // max(morning.milkingCows, afternoon.milkingCows)
  avgPerCow:   number   // totalLiters / totalCows
  morning:     MilkingSessionItem | null
  afternoon:   MilkingSessionItem | null
}

// ─── Histórico diário (para gráfico) ──────────────────────────

export type DailyProduction = {
  date:   string  // 'YYYY-MM-DD'
  liters: number
}

// ─── ActionResult (mesmo padrão dos outros módulos) ────────────
// kind discrimina a origem do erro:
//   'domain'  → regra de negócio / validação → NÃO enfileirar offline
//   'network' → falha de rede / banco / inesperado → enfileirar offline

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never; kind?: never }
  | { success: false; error: string; data?:  never; kind: 'domain' | 'network' }
