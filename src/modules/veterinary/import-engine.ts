import { addDays, subDays } from 'date-fns'
import { prisma }           from '@/lib/prisma'
import { VETERINARY_DEFAULTS } from './constants'
import type {
  VeterinaryReport,
  VeterinaryAnimalSnapshot,
  VeterinaryReportGroup,
  AlertType,
  Prisma,
} from '@prisma/client'

// ─── Public plan types ────────────────────────────────────

export type AnimalUpdatePlan = {
  animalId:   string
  animalTag:  string
  animalName: string | null
  updateData: Prisma.AnimalUpdateInput
  warnings:   string[]
}

export type VeterinaryImportPlan = {
  linkedSnapshots:       (VeterinaryAnimalSnapshot & { animalId: string })[]
  unlinkedSnapshots:     VeterinaryAnimalSnapshot[]
  animalUpdatePlans:     AnimalUpdatePlan[]
  reproductionsToCreate: Prisma.ReproductionCreateManyInput[]
  healthEventsToCreate:  Prisma.HealthEventCreateManyInput[]
  alertsToCreate:        Prisma.AlertCreateManyInput[]
  warnings:              string[]
  skippedSnapshots:      number
}

// ─── Helpers ──────────────────────────────────────────────

function isWithinDays(d1: Date, d2: Date, days: number): boolean {
  return Math.abs(d1.getTime() - d2.getTime()) <= days * 86_400_000
}

const PREGNANT_GROUPS: readonly VeterinaryReportGroup[] = [
  'PREGNANT_HEIFER', 'LACTATING_PREGNANT', 'DRY_PREGNANT', 'TO_DRY', 'CLOSE_UP',
]

// ─── Core: compute all import operations ─────────────────
// Called by buildVeterinaryImportPreview (read-only) AND
// confirmVeterinaryImport (executed inside $transaction).

export async function computeVeterinaryImportPlan(
  report:   VeterinaryReport,
  settings: { ccsAlertThreshold: number | null; emptyDaysAlert: number | null },
): Promise<VeterinaryImportPlan> {
  const ccsThreshold   = settings.ccsAlertThreshold ?? VETERINARY_DEFAULTS.ccsAlertThreshold
  const emptyDaysAlert = settings.emptyDaysAlert    ?? VETERINARY_DEFAULTS.emptyDaysAlert

  const farmId   = report.farmId
  const reportId = report.id
  const today    = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Load snapshots ────────────────────────────────────
  const allSnapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where: { reportId, farmId },
  })

  const linkedSnapshots = allSnapshots.filter(
    (s): s is VeterinaryAnimalSnapshot & { animalId: string } => s.animalId !== null,
  )
  const unlinkedSnapshots = allSnapshots.filter((s) => s.animalId === null)

  if (linkedSnapshots.length === 0) {
    return {
      linkedSnapshots:       [],
      unlinkedSnapshots,
      animalUpdatePlans:     [],
      reproductionsToCreate: [],
      healthEventsToCreate:  [],
      alertsToCreate:        [],
      warnings:              [],
      skippedSnapshots:      0,
    }
  }

  const animalIds = [...new Set(linkedSnapshots.map((s) => s.animalId))]

  // ── Load existing data for guard checks (farmId scoped) ─
  const [animals, existingRepros, pendingAlerts, recentHealthEvents] = await Promise.all([
    prisma.animal.findMany({
      where:  { id: { in: animalIds }, farmId },
      select: {
        id: true, tag: true, name: true,
        externalCode:    true,
        parityNumber:    true,
        lastCalvingDate: true,
      },
    }),
    prisma.reproduction.findMany({
      where:  { animalId: { in: animalIds } },
      select: { animalId: true, type: true, date: true, status: true, nextCheckDate: true },
    }),
    prisma.alert.findMany({
      where:  { animalId: { in: animalIds }, farmId, status: 'PENDING' },
      select: { animalId: true, type: true },
    }),
    prisma.healthEvent.findMany({
      where:  { animalId: { in: animalIds }, occurredAt: { gte: subDays(today, 7) } },
      select: { animalId: true, type: true },
    }),
  ])

  const animalMap = new Map(animals.map((a) => [a.id, a]))

  // Pending alerts set for dedup (includes intra-report)
  const pendingAlertsSet = new Set(
    pendingAlerts
      .filter((a): a is typeof a & { animalId: string } => a.animalId !== null)
      .map((a) => `${a.animalId}:${a.type}`),
  )

  // ── Accumulators ─────────────────────────────────────
  const animalUpdateMap  = new Map<string, AnimalUpdatePlan>()
  const reproductionsToCreate: Prisma.ReproductionCreateManyInput[]  = []
  const healthEventsToCreate:  Prisma.HealthEventCreateManyInput[]   = []
  const alertsToCreate:        Prisma.AlertCreateManyInput[]         = []
  const warnings:              string[]                               = []
  let   skippedSnapshots = 0

  // ── Alert helper ─────────────────────────────────────
  function addAlert(
    animalId:    string,
    animalTag:   string,
    type:        AlertType,
    title:       string,
    description: string,
    priority:    'HIGH' | 'MEDIUM' | 'LOW',
    dueDate:     Date | null,
  ): void {
    const key = `${animalId}:${type}`
    if (pendingAlertsSet.has(key)) return
    pendingAlertsSet.add(key) // prevent intra-report duplicates
    alertsToCreate.push({
      farmId,
      animalId,
      type,
      title,
      description,
      priority,
      status:  'PENDING',
      dueDate: dueDate ?? undefined,
    })
  }

  // ── Process each linked snapshot ─────────────────────
  for (const snap of linkedSnapshots) {
    const animal = animalMap.get(snap.animalId)
    if (!animal) {
      warnings.push(`Animal ${snap.animalId} não encontrado no cadastro — snapshot ${snap.id} ignorado`)
      skippedSnapshots++
      continue
    }

    const animalId   = snap.animalId
    const animalTag  = animal.tag
    const animalName = animal.name ?? null
    const reportDate = new Date(report.reportDate)

    // ── Animal field updates ──────────────────────────
    const updateData: Prisma.AnimalUpdateInput = {}
    const animalWarnings: string[]             = []

    if (snap.externalCode) {
      if (!animal.externalCode) {
        updateData.externalCode = snap.externalCode
      } else if (animal.externalCode !== snap.externalCode) {
        const msg = `[${animalTag}] externalCode: atual="${animal.externalCode}", relatório="${snap.externalCode}" — não sobrescrito`
        animalWarnings.push(msg)
        warnings.push(msg)
      }
    }

    if (snap.parityNumber !== null) {
      updateData.parityNumber = snap.parityNumber
    }

    if (snap.lastCalvingDate) {
      const snapDate = new Date(snap.lastCalvingDate)
      const current  = animal.lastCalvingDate ? new Date(animal.lastCalvingDate) : null
      if (!current || snapDate > current) {
        updateData.lastCalvingDate = snapDate
      }
    }

    // Always update these two from the latest import
    updateData.lastVeterinaryReportAt = reportDate

    if (snap.ccsThousand !== null) {
      updateData.lastCcsThousand = snap.ccsThousand
    }

    if (Object.keys(updateData).length > 0) {
      const existing = animalUpdateMap.get(animalId)
      animalUpdateMap.set(animalId, {
        animalId,
        animalTag,
        animalName,
        updateData:  existing ? { ...existing.updateData, ...updateData } : updateData,
        warnings:    existing ? [...existing.warnings, ...animalWarnings] : animalWarnings,
      })
    }

    // ── Reproductions ─────────────────────────────────

    // INSEMINATION
    if (snap.inseminationDate) {
      const insDate = new Date(snap.inseminationDate)
      const exists  = existingRepros.some(
        (r) =>
          r.animalId === animalId &&
          r.type === 'INSEMINATION' &&
          isWithinDays(new Date(r.date), insDate, 7),
      )
      if (!exists) {
        reproductionsToCreate.push({
          animalId,
          type:     'INSEMINATION',
          date:     insDate,
          status:   'CONFIRMED',
          bullName: snap.bullName ?? undefined,
        })
      }
    }

    // CALVING
    if (snap.lastCalvingDate) {
      const calvDate = new Date(snap.lastCalvingDate)
      const exists   = existingRepros.some(
        (r) =>
          r.animalId === animalId &&
          r.type === 'CALVING' &&
          isWithinDays(new Date(r.date), calvDate, 7),
      )
      if (!exists) {
        reproductionsToCreate.push({
          animalId,
          type:   'CALVING',
          date:   calvDate,
          status: 'CONFIRMED',
        })
      }
    }

    // PREGNANCY_CHECK — grupos gestantes com data prevista de parto
    if ((PREGNANT_GROUPS as readonly string[]).includes(snap.reportGroup) && snap.expectedCalvingDate) {
      const expectedDate = new Date(snap.expectedCalvingDate)
      const exists       = existingRepros.some(
        (r) =>
          r.animalId     === animalId &&
          r.type         === 'PREGNANCY_CHECK' &&
          r.status       === 'CONFIRMED' &&
          r.nextCheckDate !== null &&
          isWithinDays(new Date(r.nextCheckDate), expectedDate, 7),
      )
      if (!exists) {
        reproductionsToCreate.push({
          animalId,
          type:          'PREGNANCY_CHECK',
          date:          reportDate,
          status:        'CONFIRMED',
          nextCheckDate: expectedDate,
          bullName:      snap.bullName ?? undefined,
        })
      }
    }

    // ── HealthEvents ──────────────────────────────────

    if (snap.mastitisDays !== null && snap.mastitisDays > 0) {
      const existsMastitis = recentHealthEvents.some(
        (e) => e.animalId === animalId && e.type === 'MASTITIS',
      )
      if (!existsMastitis) {
        healthEventsToCreate.push({
          animalId,
          type:        'MASTITIS',
          description: `Mamite informada no relatório veterinário: ${snap.mastitisDays} dias`,
          occurredAt:  reportDate,
          resolved:    false,
        })
      }
    }

    if (snap.ccsThousand !== null && snap.ccsThousand >= ccsThreshold) {
      const existsCcsExam = recentHealthEvents.some(
        (e) => e.animalId === animalId && e.type === 'EXAM',
      )
      if (!existsCcsExam) {
        healthEventsToCreate.push({
          animalId,
          type:        'EXAM',
          description: `CCS elevada no relatório veterinário: ${snap.ccsThousand} x1000`,
          occurredAt:  reportDate,
          resolved:    false,
        })
      }
    }

    // ── Alerts ────────────────────────────────────────

    switch (snap.reportGroup) {
      case 'EMPTY_LATE':
        addAlert(animalId, animalTag, 'EMPTY_COW_LATE',
          `Vaca vazia atrasada — ${animalTag}`,
          `Animal em anestro há ${snap.reportDays ?? '?'} dias`,
          'HIGH', today)
        break

      case 'EMPTY_NORMAL_45D':
        if ((snap.reportDays ?? 0) >= emptyDaysAlert) {
          addAlert(animalId, animalTag, 'EMPTY_COW_LATE',
            `Vaca vazia atrasada — ${animalTag}`,
            `Animal em anestro há ${snap.reportDays ?? '?'} dias`,
            'MEDIUM', today)
        }
        break

      case 'DRY_EMPTY':
        addAlert(animalId, animalTag, 'PREGNANCY_CHECK_DUE',
          `Diagnóstico de gestação pendente — ${animalTag}`,
          'Vaca seca vazia sem diagnóstico recente',
          'MEDIUM', today)
        break

      case 'INSEMINATED_OVER_30D': {
        const dueDate = snap.inseminationDate
          ? addDays(new Date(snap.inseminationDate), 45)
          : today
        addAlert(animalId, animalTag, 'PREGNANCY_CHECK_DUE',
          `Diagnóstico de gestação pendente — ${animalTag}`,
          `Inseminada há ${snap.reportDays ?? '?'} dias`,
          'HIGH', dueDate)
        break
      }

      case 'TO_DRY': {
        const dueDate = snap.expectedCalvingDate
          ? subDays(new Date(snap.expectedCalvingDate), 60)
          : today
        addAlert(animalId, animalTag, 'DRY_OFF_DUE',
          `Secar vaca — ${animalTag}`,
          snap.expectedCalvingDate
            ? `Parto previsto para ${new Date(snap.expectedCalvingDate).toLocaleDateString('pt-BR')}`
            : 'Período de secagem iminente',
          'HIGH', dueDate)
        break
      }

      case 'PREGNANT_HEIFER':
      case 'LACTATING_PREGNANT':
      case 'DRY_PREGNANT': {
        if (snap.expectedCalvingDate) {
          const expected  = new Date(snap.expectedCalvingDate)
          const daysUntil = Math.floor((expected.getTime() - today.getTime()) / 86_400_000)
          if (daysUntil < 0) {
            addAlert(animalId, animalTag, 'CALVING_OVERDUE',
              `Parto atrasado — ${animalTag}`,
              `Parto previsto para ${expected.toLocaleDateString('pt-BR')} sem registro`,
              'HIGH', today)
          } else if (daysUntil <= 30) {
            addAlert(animalId, animalTag, 'CALVING_SOON',
              `Parto próximo — ${animalTag}`,
              `Parto previsto em ${daysUntil} dia(s)`,
              'HIGH', expected)
          }
        }
        break
      }

      case 'CLOSE_UP': {
        const dueDate = snap.expectedCalvingDate ? new Date(snap.expectedCalvingDate) : today
        addAlert(animalId, animalTag, 'CALVING_SOON',
          `Parto iminente — ${animalTag}`,
          'Vaca amojada em pré-parto',
          'HIGH', dueDate)
        break
      }

      default:
        break
    }

    // Alerta de acompanhamento de mamite (independente do grupo)
    if (snap.mastitisDays !== null && snap.mastitisDays > 0) {
      addAlert(animalId, animalTag, 'MASTITIS_FOLLOW_UP',
        `Acompanhamento de mamite — ${animalTag}`,
        `${snap.mastitisDays} dias com mamite registrada`,
        'HIGH', addDays(today, 3))
    }

    // Alerta de CCS alta
    if (snap.ccsThousand !== null && snap.ccsThousand >= ccsThreshold) {
      addAlert(animalId, animalTag, 'HIGH_CCS',
        `CCS elevada — ${animalTag}`,
        `CCS: ${snap.ccsThousand} x1000 (limite: ${ccsThreshold})`,
        'MEDIUM', addDays(today, 7))
    }

    // Alerta de revisão de descarte
    if (snap.discardRecommendation) {
      addAlert(animalId, animalTag, 'DISCARD_REVIEW',
        `Revisão de descarte — ${animalTag}`,
        `Recomendação do técnico: ${snap.discardRecommendation}`,
        'MEDIUM', addDays(today, 14))
    }
  }

  return {
    linkedSnapshots,
    unlinkedSnapshots,
    animalUpdatePlans:     [...animalUpdateMap.values()],
    reproductionsToCreate,
    healthEventsToCreate,
    alertsToCreate,
    warnings,
    skippedSnapshots,
  }
}
