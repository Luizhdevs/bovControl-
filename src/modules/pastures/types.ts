// ─── Pasto na listagem ────────────────────────────────────

export type PastureListItem = {
  id:           string
  name:         string
  areaHectares: number | null
  grassType:    string | null
  maxCapacity:  number | null
  isActive:     boolean
  _count:       { lots: number }
  animalCount:  number   // soma de animais ativos nos lotes deste pasto
}

// ─── Pasto completo com lotes ─────────────────────────────

export type PastureWithLots = PastureListItem & {
  lots: Array<{
    id:   string
    name: string
    type: string
    _count: { animals: number }
  }>
}

// ─── Resultado das Actions ────────────────────────────────

export type ActionResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }
