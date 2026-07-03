import { prisma } from '@/lib/prisma'
import { VETERINARY_GROUP_LABELS, VETERINARY_GROUP_ORDER } from './constants'
import type {
  VeterinaryReportWithStats,
  VeterinarySnapshotWithAnimal,
  VeterinaryDashboardStats,
  VeterinaryReportSummary,
  VeterinaryGroupSummary,
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

// Importa o tipo diretamente do Prisma para uso no retorno da última função
import type { VeterinaryAnimalSnapshot } from '@prisma/client'
