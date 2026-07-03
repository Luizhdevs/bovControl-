import type {
  VeterinaryReport,
  VeterinaryAnimalSnapshot,
  VeterinaryReportGroup,
  VeterinaryReportStatus,
  VeterinaryReportSource,
  Animal,
} from '@prisma/client'

// ─── ActionResult ─────────────────────────────────────────

export type ActionResult<T> =
  | { success: true;  data: T }
  | { success: false; error: string }

// ─── Report ───────────────────────────────────────────────

export type VeterinaryReportWithStats = VeterinaryReport & {
  _count: { snapshots: number }
  groupSummary?: VeterinaryGroupSummary[]
}

export type VeterinaryGroupSummary = {
  group:     VeterinaryReportGroup
  label:     string
  count:     number
  unmatched: number
}

// ─── Snapshot ─────────────────────────────────────────────

export type VeterinarySnapshotWithAnimal = VeterinaryAnimalSnapshot & {
  animal: Pick<Animal, 'id' | 'tag' | 'name' | 'category' | 'milkStatus'> | null
}

// ─── Dashboard ────────────────────────────────────────────

export type VeterinaryDashboardStats = {
  latestReport:       VeterinaryReportSummary | null
  groupCounts:        Record<VeterinaryReportGroup, number>
  pendingAlertCounts: {
    emptyLate:        number
    toDry:            number
    calvingSoon:      number
    closeUp:          number
    highCcs:          number
    mastitis:         number
    pregnancyCheck:   number
    discard:          number
  }
  totalAnimalsInReport: number
  unmatchedCount:       number
}

export type VeterinaryReportSummary = {
  id:              string
  reportDate:      Date
  sourceSystem:    VeterinaryReportSource
  technicianName:  string | null
  importStatus:    VeterinaryReportStatus
  totalRows:       number
  matchedRows:     number
  unmatchedRows:   number
}

// ─── Filters ──────────────────────────────────────────────

export type VeterinaryReportFilters = {
  sourceSystem?: VeterinaryReportSource
  importStatus?: VeterinaryReportStatus
  page?:         number
  pageSize?:     number
}

// ─── Permissões ───────────────────────────────────────────

export type VeterinaryPermissions = {
  canView:          boolean
  canImport:        boolean
  canReviewLinks:   boolean
  canDelete:        boolean
  canExport:        boolean
  canResolveAlerts: boolean
}
