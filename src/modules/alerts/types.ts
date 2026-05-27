export type AlertType =
  | 'HEAT'
  | 'PREGNANCY_CHECK'
  | 'DRY_OFF'
  | 'CALVING'
  | 'VACCINATION'
  | 'WEIGHT_CHECK'

export type Priority    = 'HIGH' | 'MEDIUM' | 'LOW'
export type AlertStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED'

export type AlertWithAnimal = {
  id:          string
  farmId:      string
  animalId:    string | null
  type:        AlertType
  title:       string
  description: string | null
  priority:    Priority
  status:      AlertStatus
  dueDate:     Date | null
  resolvedAt:  Date | null
  createdAt:   Date
  animal:      { id: string; tag: string; name: string | null } | null
}

export type AlertFilters = {
  status?: AlertStatus
  type?:   AlertType
}

export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string }
