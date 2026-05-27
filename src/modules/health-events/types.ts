import type { HealthEventType } from '@prisma/client'

// ─── Item de lista / timeline ──────────────────────────────

export type HealthEventItem = {
  id:          string
  animalId:    string
  type:        HealthEventType
  description: string
  medication:  string | null
  cost:        number | null
  occurredAt:  Date
  resolved:    boolean
  notes:       string | null
  animal: {
    id:     string
    tag:    string
    name:   string | null
    farmId: string
  }
}

// ─── Página paginada ───────────────────────────────────────

export type HealthEventPage = {
  items:     HealthEventItem[]
  total:     number
  page:      number
  pageCount: number
}

// ─── Labels e cores ───────────────────────────────────────

export const HEALTH_EVENT_LABELS: Record<HealthEventType, string> = {
  VACCINATION: 'Vacinação',
  DISEASE:     'Doença',
  DEWORMING:   'Vermifugação',
  EXAM:        'Exame',
  MEDICATION:  'Medicação',
  OTHER:       'Outro',
}

export const HEALTH_EVENT_COLORS: Record<HealthEventType, string> = {
  VACCINATION: 'text-green-400  bg-green-500/10  border-green-500/30',
  DISEASE:     'text-red-400    bg-red-500/10    border-red-500/30',
  DEWORMING:   'text-amber-400  bg-amber-500/10  border-amber-500/30',
  EXAM:        'text-blue-400   bg-blue-500/10   border-blue-500/30',
  MEDICATION:  'text-purple-400 bg-purple-500/10 border-purple-500/30',
  OTHER:       'text-zinc-400   bg-zinc-500/10   border-zinc-500/30',
}

export const HEALTH_EVENT_ICONS: Record<HealthEventType, string> = {
  VACCINATION: '💉',
  DISEASE:     '🤒',
  DEWORMING:   '🐛',
  EXAM:        '🔬',
  MEDICATION:  '💊',
  OTHER:       '📋',
}

// ─── ActionResult ──────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T;       error?: never }
  | { success: false; error: string; data?:  never }
