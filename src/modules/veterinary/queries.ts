import { prisma } from '@/lib/prisma'
import { VETERINARY_GROUP_LABELS, VETERINARY_GROUP_ORDER } from './constants'
import { computeVeterinaryImportPlan } from './import-engine'
import type {
  VeterinaryReportWithStats,
  VeterinarySnapshotWithAnimal,
  VeterinaryDashboardStats,
  VeterinaryReportSummary,
  VeterinaryGroupSummary,
  VeterinaryImportPreview,
  AnimalFromSnapshotPreview,
  CreateAnimalsFromSnapshotsPreview,
} from './types'
import type { VeterinaryReportFiltersInput } from './schemas'
import type { VeterinaryReportGroup } from '@prisma/client'

// ─── Lista paginada de relatórios ─────────────────────────

export async function getVeterinaryReports(
  farmId:  string,
  filters: Partial<VeterinaryReportFiltersInput> = {},
): Promise<{ items: VeterinaryReportWithStats[]; total: number; page: number; pageCount: number }> {
  const page     = filters.page     ?? 1
  const pageSize = filters.pageSize ?? 20
  const skip     = (page - 1) * pageSize

  const where = {
    farmId,
    ...(filters.sourceSystem ? { sourceSystem: filters.sourceSystem } : {}),
    ...(filters.importStatus ? { importStatus: filters.importStatus } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.veterinaryReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      skip,
      take: pageSize,
      include: {
        _count: { select: { snapshots: true } },
      },
    }),
    prisma.veterinaryReport.count({ where }),
  ])

  return {
    items:     items as VeterinaryReportWithStats[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

// ─── Detalhe de um relatório ──────────────────────────────

export async function getVeterinaryReportById(
  id:     string,
  farmId: string,
): Promise<VeterinaryReportWithStats | null> {
  const report = await prisma.veterinaryReport.findFirst({
    where: { id, farmId },
    include: {
      _count: { select: { snapshots: true } },
    },
  })

  if (!report) return null

  // Gera o resumo por grupo dentro do relatório
  const groupRaw = await prisma.veterinaryAnimalSnapshot.groupBy({
    by:    ['reportGroup'],
    where: { reportId: id, farmId },
    _count: { id: true },
  })

  const unmatchedByGroup = await prisma.veterinaryAnimalSnapshot.groupBy({
    by:    ['reportGroup'],
    where: { reportId: id, farmId, animalId: null },
    _count: { id: true },
  })

  const unmatchedMap = Object.fromEntries(
    unmatchedByGroup.map((r) => [r.reportGroup, r._count.id]),
  )

  const groupSummary: VeterinaryGroupSummary[] = VETERINARY_GROUP_ORDER
    .map((group) => {
      const row = groupRaw.find((r) => r.reportGroup === group)
      if (!row) return null
      return {
        group,
        label:     VETERINARY_GROUP_LABELS[group],
        count:     row._count.id,
        unmatched: unmatchedMap[group] ?? 0,
      }
    })
    .filter((g): g is VeterinaryGroupSummary => g !== null)

  return { ...report, groupSummary } as VeterinaryReportWithStats
}

// ─── Snapshots de um relatório ────────────────────────────

export async function getSnapshotsByReport(
  reportId: string,
  farmId:   string,
  group?:   VeterinaryReportGroup,
): Promise<VeterinarySnapshotWithAnimal[]> {
  const rows = await prisma.veterinaryAnimalSnapshot.findMany({
    where: {
      reportId,
      farmId,
      ...(group ? { reportGroup: group } : {}),
    },
    include: {
      animal: {
        select: { id: true, tag: true, name: true, category: true, milkStatus: true },
      },
    },
    orderBy: [
      { reportGroup: 'asc' },
      { animalName:  'asc' },
    ],
  })

  return rows as VeterinarySnapshotWithAnimal[]
}

// ─── Último snapshot de um animal ─────────────────────────

export async function getLatestSnapshotForAnimal(
  animalId: string,
  farmId:   string,
): Promise<VeterinarySnapshotWithAnimal | null> {
  const row = await prisma.veterinaryAnimalSnapshot.findFirst({
    where: { animalId, farmId },
    orderBy: { createdAt: 'desc' },
    include: {
      animal: {
        select: { id: true, tag: true, name: true, category: true, milkStatus: true },
      },
    },
  })

  return row as VeterinarySnapshotWithAnimal | null
}

// ─── Histórico de snapshots de um animal ──────────────────

export async function getSnapshotHistoryForAnimal(
  animalId: string,
  farmId:   string,
  limit     = 10,
): Promise<VeterinarySnapshotWithAnimal[]> {
  const rows = await prisma.veterinaryAnimalSnapshot.findMany({
    where: { animalId, farmId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      animal: {
        select: { id: true, tag: true, name: true, category: true, milkStatus: true },
      },
    },
  })

  return rows as VeterinarySnapshotWithAnimal[]
}

// ─── Stats do dashboard veterinário ──────────────────────

export async function getVeterinaryDashboardStats(
  farmId: string,
): Promise<VeterinaryDashboardStats> {
  // Relatório mais recente importado (ou parcialmente importado)
  const latestReportRaw = await prisma.veterinaryReport.findFirst({
    where:   { farmId, importStatus: { in: ['IMPORTED', 'PARTIALLY_IMPORTED'] } },
    orderBy: { reportDate: 'desc' },
    select: {
      id:            true,
      reportDate:    true,
      sourceSystem:  true,
      technicianName:true,
      importStatus:  true,
      totalRows:     true,
      matchedRows:   true,
      unmatchedRows: true,
    },
  })

  const latestReport: VeterinaryReportSummary | null = latestReportRaw

  if (!latestReport) {
    const empty: Record<VeterinaryReportGroup, number> = {
      EMPTY_NORMAL_45D:    0,
      EMPTY_LATE:          0,
      DRY_EMPTY:           0,
      INSEMINATED_OVER_30D:0,
      TO_DRY:              0,
      PREGNANT_HEIFER:     0,
      LACTATING_PREGNANT:  0,
      DRY_PREGNANT:        0,
      CLOSE_UP:            0,
      UNKNOWN:             0,
    }

    return {
      latestReport:         null,
      groupCounts:          empty,
      pendingAlertCounts:   {
        emptyLate:      0,
        toDry:          0,
        calvingSoon:    0,
        closeUp:        0,
        highCcs:        0,
        mastitis:       0,
        pregnancyCheck: 0,
        discard:        0,
      },
      totalAnimalsInReport: 0,
      unmatchedCount:       0,
    }
  }

  // Contagem por grupo no relatório mais recente
  const groupRows = await prisma.veterinaryAnimalSnapshot.groupBy({
    by:    ['reportGroup'],
    where: { reportId: latestReport.id, farmId },
    _count: { id: true },
  })

  const groupCounts: Record<VeterinaryReportGroup, number> = {
    EMPTY_NORMAL_45D:    0,
    EMPTY_LATE:          0,
    DRY_EMPTY:           0,
    INSEMINATED_OVER_30D:0,
    TO_DRY:              0,
    PREGNANT_HEIFER:     0,
    LACTATING_PREGNANT:  0,
    DRY_PREGNANT:        0,
    CLOSE_UP:            0,
    UNKNOWN:             0,
  }
  for (const row of groupRows) {
    groupCounts[row.reportGroup] = row._count.id
  }

  // Contagem de alertas veterinários pendentes
  const [emptyLate, toDry, calvingSoon, closeUp, highCcs, mastitis, pregnancyCheck, discard] =
    await Promise.all([
      prisma.alert.count({ where: { farmId, type: 'EMPTY_COW_LATE',       status: 'PENDING' } }),
      prisma.alert.count({ where: { farmId, type: 'DRY_OFF_DUE',          status: 'PENDING' } }),
      prisma.alert.count({ where: { farmId, type: 'CALVING_SOON',         status: 'PENDING' } }),
      prisma.alert.count({ where: { farmId, type: 'CALVING_SOON',         status: 'PENDING', priority: 'HIGH' } }),
      prisma.alert.count({ where: { farmId, type: 'HIGH_CCS',             status: 'PENDING' } }),
      prisma.alert.count({ where: { farmId, type: 'MASTITIS_FOLLOW_UP',   status: 'PENDING' } }),
      prisma.alert.count({ where: { farmId, type: 'PREGNANCY_CHECK_DUE',  status: 'PENDING' } }),
      prisma.alert.count({ where: { farmId, type: 'DISCARD_REVIEW',       status: 'PENDING' } }),
    ])

  const unmatchedCount = await prisma.veterinaryAnimalSnapshot.count({
    where: { reportId: latestReport.id, farmId, animalId: null },
  })

  return {
    latestReport,
    groupCounts,
    pendingAlertCounts: {
      emptyLate,
      toDry,
      calvingSoon,
      closeUp,
      highCcs,
      mastitis,
      pregnancyCheck,
      discard,
    },
    totalAnimalsInReport: latestReport.totalRows,
    unmatchedCount,
  }
}

// ─── Snapshots sem vínculo (tela de revisão) ──────────────

export async function getUnmatchedSnapshots(
  reportId: string,
  farmId:   string,
): Promise<VeterinaryAnimalSnapshot[]> {
  return prisma.veterinaryAnimalSnapshot.findMany({
    where:   { reportId, farmId, animalId: null },
    orderBy: { animalName: 'asc' },
  })
}

// ─── Revisão completa de um import draft ─────────────────

export async function getVeterinaryImportReview(
  reportId: string,
  farmId:   string,
): Promise<import('./types').VeterinaryImportReview | null> {
  const report = await getVeterinaryReportById(reportId, farmId)
  if (!report) return null

  const allSnapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where:   { reportId, farmId },
    include: {
      animal: {
        select: { id: true, tag: true, name: true, category: true, milkStatus: true },
      },
    },
    orderBy: [{ reportGroup: 'asc' }, { animalName: 'asc' }],
  })

  const autoMatched:   VeterinarySnapshotWithAnimal[]  = []
  const pendingReview: VeterinarySnapshotWithAnimal[]  = []
  const unmatched:     VeterinaryAnimalSnapshot[]      = []
  const parseErrors:   VeterinaryAnimalSnapshot[]      = []

  for (const snap of allSnapshots) {
    const raw = snap.rawRow as { matchStatus?: string } | null
    const status = raw?.matchStatus as string | undefined

    if (status === 'ERROR') {
      parseErrors.push(snap)
    } else if (snap.animalId !== null) {
      // Strong match — auto-filled
      autoMatched.push(snap as VeterinarySnapshotWithAnimal)
    } else if (
      status === 'EXACT_NAME' ||
      status === 'NORMALIZED_NAME' ||
      status === 'DUPLICATE_CANDIDATES'
    ) {
      // Weak or ambiguous — needs review, but candidates exist
      pendingReview.push(snap as VeterinarySnapshotWithAnimal)
    } else {
      unmatched.push(snap)
    }
  }

  return { report, autoMatched, pendingReview, unmatched, parseErrors }
}

// ─── Relatório pendente (DRAFT / PARTIALLY_IMPORTED) ─────

export async function getPendingVeterinaryReport(farmId: string) {
  return prisma.veterinaryReport.findFirst({
    where:   { farmId, importStatus: { in: ['DRAFT', 'PARTIALLY_IMPORTED'] } },
    orderBy: { updatedAt: 'desc' },
    select:  { id: true, importStatus: true, reportDate: true, sourceSystem: true },
  })
}

// ─── Lista de atenção (CLOSE_UP, TO_DRY, EMPTY_LATE …) ──

const ATTENTION_GROUPS: VeterinaryReportGroup[] = [
  'CLOSE_UP', 'TO_DRY', 'EMPTY_LATE', 'INSEMINATED_OVER_30D', 'DRY_EMPTY',
]

const ATTENTION_GROUP_PRIORITY: Record<string, number> = {
  CLOSE_UP: 0, TO_DRY: 1, EMPTY_LATE: 2, INSEMINATED_OVER_30D: 3, DRY_EMPTY: 4,
}

export async function getVeterinaryAttentionList(farmId: string, limit = 15) {
  const latestReport = await prisma.veterinaryReport.findFirst({
    where:   { farmId, importStatus: { in: ['IMPORTED', 'PARTIALLY_IMPORTED'] } },
    orderBy: { reportDate: 'desc' },
    select:  { id: true },
  })
  if (!latestReport) return []

  const rows = await prisma.veterinaryAnimalSnapshot.findMany({
    where: {
      reportId:    latestReport.id,
      farmId,
      reportGroup: { in: ATTENTION_GROUPS },
      animalId:    { not: null },
    },
    include: {
      animal: { select: { id: true, tag: true, name: true } },
    },
    take: limit * 2,
  })

  const sorted = [...rows].sort((a, b) => {
    const pa = ATTENTION_GROUP_PRIORITY[a.reportGroup] ?? 99
    const pb = ATTENTION_GROUP_PRIORITY[b.reportGroup] ?? 99
    if (pa !== pb) return pa - pb
    return (a.animalName ?? '').localeCompare(b.animalName ?? '', 'pt-BR')
  })

  return sorted.slice(0, limit)
}

// ─── Histórico de snapshots para o card do animal ─────────

export async function getSnapshotHistoryForAnimalCard(
  animalId: string,
  farmId:   string,
  limit     = 5,
) {
  return prisma.veterinaryAnimalSnapshot.findMany({
    where:   { animalId, farmId },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    include: {
      report: { select: { id: true, reportDate: true, sourceSystem: true } },
    },
  })
}

// ─── Sprint 9.1E.1 — Preview: criar animais de snapshots ──

function stripAccentsVet(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeVetAnimalName(name: string | null | undefined): string {
  if (!name) return ''
  return stripAccentsVet(name).toLowerCase().trim().replace(/\s+/g, ' ')
}

export async function buildCreateAnimalsFromVeterinarySnapshotsPreview(
  reportId: string,
  farmId:   string,
): Promise<CreateAnimalsFromSnapshotsPreview | null> {
  const report = await prisma.veterinaryReport.findFirst({
    where:  { id: reportId, farmId },
    select: { id: true, importStatus: true },
  })
  if (!report) return null
  if (!['DRAFT', 'PARTIALLY_IMPORTED'].includes(report.importStatus)) return null

  const snapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where: { reportId, farmId, animalId: null, reportGroup: { not: 'UNKNOWN' } },
    select: {
      id:              true,
      externalCode:    true,
      animalName:      true,
      reportGroup:     true,
      parityNumber:    true,
      lastCalvingDate: true,
      ccsThousand:     true,
      breed:           true,
    },
  })

  // Group by externalCode (primary) or normalizedName (fallback)
  const groupMap = new Map<string, typeof snapshots>()
  for (const snap of snapshots) {
    let key: string | null = null
    if (snap.externalCode) {
      key = `ext:${snap.externalCode.trim().toUpperCase()}`
    } else if (snap.animalName) {
      key = `name:${normalizeVetAnimalName(snap.animalName)}`
    }
    if (!key) continue
    const existing = groupMap.get(key)
    if (existing) existing.push(snap)
    else groupMap.set(key, [snap])
  }

  // Conflict detection — load existing animals
  const extCodes = [...groupMap.keys()]
    .filter((k) => k.startsWith('ext:'))
    .map((k) => k.slice(4))

  const [existingByCode, existingWithName] = await Promise.all([
    extCodes.length > 0
      ? prisma.animal.findMany({
          where:  { farmId, externalCode: { in: extCodes } },
          select: { externalCode: true, tag: true },
        })
      : Promise.resolve([]),
    prisma.animal.findMany({
      where:  { farmId, name: { not: null } },
      select: { name: true, tag: true },
    }),
  ])

  const existingCodeSet = new Set(
    existingByCode
      .filter((a) => a.externalCode !== null)
      .map((a) => (a.externalCode as string).trim().toUpperCase()),
  )

  const existingNameMap = new Map<string, string>(
    existingWithName
      .filter((a): a is typeof a & { name: string } => a.name !== null)
      .map((a) => [normalizeVetAnimalName(a.name), a.tag]),
  )

  // Build preview items
  const animalsToCreate: AnimalFromSnapshotPreview[] = []
  const warnings: string[] = []

  for (const [key, snaps] of groupMap) {
    const firstSnap = snaps[0]
    if (!firstSnap) continue

    const externalCode   = firstSnap.externalCode ?? null
    const animalName     = firstSnap.animalName   ?? null
    const normName       = normalizeVetAnimalName(animalName)

    const hasHeiferGroup = snaps.some((s) => s.reportGroup === 'PREGNANT_HEIFER')
    const category: 'COW' | 'HEIFER' = hasHeiferGroup ? 'HEIFER' : 'COW'

    let parityNumber: number | null = null
    let lastCalvingDate: Date | null = null
    let ccsThousand: number | null   = null
    const breed = snaps.find((s) => s.breed)?.breed ?? null

    for (const s of snaps) {
      if (s.parityNumber !== null) {
        parityNumber = parityNumber === null ? s.parityNumber : Math.max(parityNumber, s.parityNumber)
      }
      if (s.lastCalvingDate) {
        const d = new Date(s.lastCalvingDate)
        if (!lastCalvingDate || d > lastCalvingDate) lastCalvingDate = d
      }
      if (s.ccsThousand !== null) {
        ccsThousand = ccsThousand === null ? s.ccsThousand : Math.max(ccsThousand, s.ccsThousand)
      }
    }

    const groups = [...new Set(snaps.map((s) => s.reportGroup))]

    let hasConflict    = false
    let conflictReason: string | undefined

    if (externalCode && existingCodeSet.has(externalCode.trim().toUpperCase())) {
      hasConflict    = true
      conflictReason = `externalCode "${externalCode}" já existe na fazenda`
    } else if (!externalCode && normName && existingNameMap.has(normName)) {
      hasConflict    = true
      const t        = existingNameMap.get(normName)
      conflictReason = `Nome similar ao animal ${t}`
    }

    animalsToCreate.push({
      key,
      externalCode,
      animalName,
      category,
      breed,
      parityNumber,
      lastCalvingDate,
      ccsThousand,
      snapshotCount: snaps.length,
      snapshotIds:   snaps.map((s) => s.id),
      groups,
      hasConflict,
      conflictReason,
    })
  }

  const conflictCount   = animalsToCreate.filter((a) => a.hasConflict).length
  const createCount     = animalsToCreate.length - conflictCount
  const snapshotsToLink = animalsToCreate
    .filter((a) => !a.hasConflict)
    .reduce((sum, a) => sum + a.snapshotCount, 0)

  return { animalsToCreate, conflictCount, createCount, snapshotsToLink, warnings }
}

// Importa o tipo diretamente do Prisma para uso no retorno da última função
import type { VeterinaryAnimalSnapshot } from '@prisma/client'

// ─── Preview da confirmação (read-only) ───────────────────

export async function buildVeterinaryImportPreview(
  reportId: string,
  farmId:   string,
): Promise<VeterinaryImportPreview | null> {
  const report = await prisma.veterinaryReport.findFirst({
    where: { id: reportId, farmId },
  })
  if (!report) return null

  const farmSettings = await prisma.farmSettings.findFirst({
    where:  { farmId },
    select: { ccsAlertThreshold: true, emptyDaysAlert: true },
  })

  const plan = await computeVeterinaryImportPlan(
    report,
    farmSettings ?? { ccsAlertThreshold: null, emptyDaysAlert: null },
  )

  return {
    linkedCount:           plan.linkedSnapshots.length,
    unmatchedCount:        plan.unlinkedSnapshots.length,
    animalsToUpdate:       plan.animalUpdatePlans.length,
    reproductionsToCreate: plan.reproductionsToCreate.length,
    healthEventsToCreate:  plan.healthEventsToCreate.length,
    alertsToCreate:        plan.alertsToCreate.length,
    skippedSnapshots:      plan.skippedSnapshots,
    warnings:              plan.warnings,
  }
}
