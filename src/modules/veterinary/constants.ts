import type { VeterinaryReportGroup } from '@prisma/client'
import type { UserRole } from '@prisma/client'

// ─── Labels dos grupos veterinários ───────────────────────

export const VETERINARY_GROUP_LABELS: Record<VeterinaryReportGroup, string> = {
  EMPTY_NORMAL_45D:    'Vazias normais +45 dias',
  EMPTY_LATE:          'Vazias atrasadas',
  DRY_EMPTY:           'Secas vazias',
  INSEMINATED_OVER_30D:'Inseminadas +30 dias',
  TO_DRY:              'A secar',
  PREGNANT_HEIFER:     'Novilhas gestantes',
  LACTATING_PREGNANT:  'Lactação gestantes',
  DRY_PREGNANT:        'Secas gestantes',
  CLOSE_UP:            'Amojadas',
  UNKNOWN:             'Não identificado',
}

// ─── Ordem de exibição dos grupos no dashboard ────────────
// Grupos críticos (ação urgente) aparecem primeiro.

export const VETERINARY_GROUP_ORDER: VeterinaryReportGroup[] = [
  'CLOSE_UP',
  'EMPTY_LATE',
  'TO_DRY',
  'INSEMINATED_OVER_30D',
  'DRY_EMPTY',
  'LACTATING_PREGNANT',
  'DRY_PREGNANT',
  'PREGNANT_HEIFER',
  'EMPTY_NORMAL_45D',
  'UNKNOWN',
]

// ─── Defaults de configuração veterinária ─────────────────
// Usados quando FarmSettings.ccsAlertThreshold / etc. são null.

export const VETERINARY_DEFAULTS = {
  ccsAlertThreshold: 400,   // CCS x 1000
  mastitisDaysAlert: 3,     // dias
  emptyDaysAlert:    90,    // dias sem IA para considerar vazia atrasada
  closeUpDays:       15,    // dias até parto para gerar CALVING_SOON
  dryOffDays:        60,    // dias antes do parto para gerar DRY_OFF_DUE
} as const

// ─── RBAC do módulo veterinário ──────────────────────────

export const VETERINARY_PERMISSIONS: Record<
  UserRole,
  {
    canView:          boolean
    canImport:        boolean
    canReviewLinks:   boolean
    canDelete:        boolean
    canExport:        boolean
    canResolveAlerts: boolean
  }
> = {
  OWNER: {
    canView:          true,
    canImport:        true,
    canReviewLinks:   true,
    canDelete:        true,
    canExport:        true,
    canResolveAlerts: true,
  },
  MANAGER: {
    canView:          true,
    canImport:        true,
    canReviewLinks:   true,
    canDelete:        false,
    canExport:        false,
    canResolveAlerts: true,
  },
  WORKER: {
    canView:          true,
    canImport:        false,
    canReviewLinks:   false,
    canDelete:        false,
    canExport:        false,
    canResolveAlerts: true,
  },
  VIEWER: {
    canView:          true,
    canImport:        false,
    canReviewLinks:   false,
    canDelete:        false,
    canExport:        false,
    canResolveAlerts: false,
  },
}

// ─── Labels de status do relatório ────────────────────────

export const REPORT_STATUS_LABELS = {
  DRAFT:              'Rascunho',
  IMPORTED:           'Importado',
  PARTIALLY_IMPORTED: 'Parcialmente importado',
  FAILED:             'Falhou',
} as const

// ─── Labels de fonte do relatório ─────────────────────────

export const REPORT_SOURCE_LABELS = {
  PRODAP: 'PRODAP',
  ZIL:    'ZIL',
  MANUAL: 'Manual',
  CSV:    'CSV',
  OTHER:  'Outro',
} as const

// ─── Labels de significado dos dias ───────────────────────

export const DAY_MEANING_LABELS = {
  DAYS_POSTPARTUM:         'Dias pós-parto',
  DAYS_PREGNANT:           'Dias de gestação',
  DAYS_SINCE_INSEMINATION: 'Dias desde a IA',
  DAYS_OPEN:               'Dias vazia',
  UNKNOWN:                 'Não identificado',
} as const
