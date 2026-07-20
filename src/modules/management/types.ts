// ─── Tipos do módulo de Manejo de Hoje ───────────────────

export type ManagementActionType =
  | 'CALVING_OVERDUE'
  | 'CALVING_SOON'
  | 'DRY_OFF_DUE'
  | 'EMPTY_COW_LATE'
  | 'PREGNANCY_CHECK_DUE'
  | 'MASTITIS_FOLLOW_UP'
  | 'HIGH_CCS'
  | 'DISCARD_REVIEW'
  | 'INCOMPLETE_CALF'
  | 'MISSING_PHOTO'
  | 'MISSING_LOT'
  | 'PENDING_ALERT'

export type ManagementPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export type AnimalOriginLabel =
  | 'VETERINARY_IMPORTED'
  | 'MANUAL'
  | 'MIXED'
  | 'UNKNOWN'

export interface ManagementActionItem {
  id:           string
  animalId:     string
  animalTag:    string
  animalName:   string | null
  externalCode: string | null
  origin:       AnimalOriginLabel
  category:     string | null
  lotName:      string | null
  photoUrl:     string | null
  milkStatus:   string | null
  title:        string
  reason:       string
  priority:     ManagementPriority
  type:         ManagementActionType
  days:         number | null
  dueDate:      Date | null
  href:         string
}

export interface ManagementSummary {
  totalActions:        number
  highPriority:        number
  mediumPriority:      number
  lowPriority:         number
  closeToCalving:      number
  overdueCalving:      number
  dueToDryOff:         number
  emptyLate:           number
  pregnancyCheckDue:   number
  incompleteCalves:    number
  animalsWithoutLot:   number
  animalsWithoutPhoto: number
  pendingAlerts:       number
}

export interface ManagementSections {
  critical:     ManagementActionItem[]
  calving:      ManagementActionItem[]
  dryOff:       ManagementActionItem[]
  reproduction: ManagementActionItem[]
  calves:       ManagementActionItem[]
  registration: ManagementActionItem[]
  health:       ManagementActionItem[]
  alerts:       ManagementActionItem[]
}

export interface ManagementOverview {
  summary:  ManagementSummary
  sections: ManagementSections
}
