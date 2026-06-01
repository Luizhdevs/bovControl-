// ─── Core types ────────────────────────────────────────────

export type AuditLogUser = {
  id:    string
  name:  string
  email: string
}

export type AuditLogItem = {
  id:        string
  farmId:    string
  userId:    string
  action:    string
  entity:    string
  entityId:  string
  before:    unknown
  after:     unknown
  metadata:  unknown
  createdAt: Date
  user:      AuditLogUser
}

export type AuditLogPage = {
  items:     AuditLogItem[]
  total:     number
  page:      number
  pageCount: number
}

export type AuditLogFilters = {
  entity?:  string
  action?:  string
  userId?:  string
  period?:  string
}

// ─── Labels e classes ──────────────────────────────────────

export const ENTITY_LABELS: Record<string, string> = {
  Animal:         'Animal',
  AnimalPhoto:    'Foto',
  WeightRecord:   'Pesagem',
  Lot:            'Lote',
  Reproduction:   'Reprodução',
  Invite:         'Convite',
  FarmUser:       'Membro',
  Alert:          'Alerta',
  HealthEvent:    'Saúde',
  FeedSession:    'Alimentação',
  FeedType:       'Tipo de Ração',
  MilkingSession: 'Ordenha',
  MilkRecord:     'Leite',
  FarmSettings:   'Configurações',
  AuditLog:       'Auditoria',
}

export const ALL_ENTITIES = Object.keys(ENTITY_LABELS)

export const ACTION_LABELS: Record<string, string> = {
  CREATE:     'Criação',
  UPDATE:     'Edição',
  DELETE:     'Exclusão',
  DEACTIVATE: 'Desativação',
  ACTIVATE:   'Ativação',
  SOFT_DELETE:'Remoção',
  EXPORT:     'Exportação',
}

export const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export const ACTION_BADGE_CLASSES: Record<string, string> = {
  CREATE:     'bg-green-500/15 text-green-700 dark:text-green-400',
  UPDATE:     'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  DELETE:     'bg-red-500/15 text-red-700 dark:text-red-400',
  DEACTIVATE: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  ACTIVATE:   'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  SOFT_DELETE:'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  EXPORT:     'bg-violet-500/15 text-violet-700 dark:text-violet-400',
}

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje'     },
  { value: '7d',    label: '7 dias'   },
  { value: '30d',   label: '30 dias'  },
  { value: '90d',   label: '90 dias'  },
] as const
