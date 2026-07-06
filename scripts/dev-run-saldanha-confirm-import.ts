/**
 * DEV ONLY — ETAPA 5 — Confirmar importação veterinária Fazenda Saldanha
 *
 * Executa o mesmo plano de computeVeterinaryImportPlan, mas sem auth/session.
 * Garante idempotência: aborta se o relatório já estiver IMPORTED.
 *
 * Uso:
 *   npx tsx scripts/dev-run-saldanha-confirm-import.ts            # dry-run
 *   npx tsx scripts/dev-run-saldanha-confirm-import.ts --execute   # confirmar
 */
import { addDays, subDays } from 'date-fns'
import { prisma } from '../src/lib/prisma'
import type { Prisma, VeterinaryReportGroup, AlertType } from '@prisma/client'

const REPORT_ID = process.env.REPORT_ID ?? 'cmr5g23cf0002a94s1v0br3m6'
const EXECUTE   = process.argv.includes('--execute')

const VETERINARY_DEFAULTS = { ccsAlertThreshold: 400, emptyDaysAlert: 90 }

const PREGNANT_GROUPS: VeterinaryReportGroup[] = [
  'PREGNANT_HEIFER', 'LACTATING_PREGNANT', 'DRY_PREGNANT', 'TO_DRY', 'CLOSE_UP',
]

function isWithinDays(d1: Date, d2: Date, days: number): boolean {
  return Math.abs(d1.getTime() - d2.getTime()) <= days * 86_400_000
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('  DEV: CONFIRMAR IMPORTAÇÃO — Fazenda Saldanha')
  console.log(`  Modo: ${EXECUTE ? '⚡ EXECUTAR' : '🔍 DRY-RUN (preview)'}`)
  console.log(`  Relatório: ${REPORT_ID}`)
  console.log('══════════════════════════════════════════════════════════\n')

  // ── 1. Carregar relatório ─────────────────────────────
  const report = await prisma.veterinaryReport.findUnique({ where: { id: REPORT_ID } })
  if (!report) throw new Error(`Relatório ${REPORT_ID} não encontrado`)

  const { farmId } = report
  console.log(`✅ Relatório | farmId=${farmId} | status=${report.importStatus}`)

  if (report.importStatus === 'IMPORTED') {
    console.log('\n⚠️  Relatório já está IMPORTED — operação idempotente, abortando.')
    return
  }
  if (!['DRAFT', 'PARTIALLY_IMPORTED'].includes(report.importStatus)) {
    throw new Error(`Status inesperado: ${report.importStatus}`)
  }

  // UserId para audit log
  const farmUser = await prisma.farmUser.findFirst({
    where:  { farmId, role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true, role: true },
  })
  const userId = farmUser?.userId ?? 'SCRIPT_DEV'

  // ── 2. Configurações da fazenda ───────────────────────
  const farmSettings = await prisma.farmSettings.findFirst({
    where:  { farmId },
    select: { ccsAlertThreshold: true, emptyDaysAlert: true },
  })
  const ccsThreshold   = farmSettings?.ccsAlertThreshold ?? VETERINARY_DEFAULTS.ccsAlertThreshold
  const emptyDaysAlert = farmSettings?.emptyDaysAlert    ?? VETERINARY_DEFAULTS.emptyDaysAlert

  console.log(`   ccsThreshold=${ccsThreshold}  emptyDaysAlert=${emptyDaysAlert}`)

  // ── 3. Carregar snapshots ─────────────────────────────
  const allSnapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where: { reportId: REPORT_ID, farmId },
  })
  const linkedSnapshots   = allSnapshots.filter(
    (s): s is typeof s & { animalId: string } => s.animalId !== null,
  )
  const unlinkedSnapshots = allSnapshots.filter((s) => s.animalId === null)

  console.log(`   Snapshots totais:     ${allSnapshots.length}`)
  console.log(`   Snapshots vinculados: ${linkedSnapshots.length}`)
  console.log(`   Snapshots sem link:   ${unlinkedSnapshots.length}`)

  if (linkedSnapshots.length === 0) {
    throw new Error('Nenhum snapshot vinculado. Execute create-animals primeiro.')
  }

  // ── 4. Carregar animais e dados existentes ─────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const animalIds = [...new Set(linkedSnapshots.map((s) => s.animalId))]

  const [animals, existingRepros, pendingAlerts, recentHealthEvents] = await Promise.all([
    prisma.animal.findMany({
      where:  { id: { in: animalIds }, farmId },
      select: { id: true, tag: true, name: true, externalCode: true, parityNumber: true, lastCalvingDate: true },
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

  // ── 5. Calcular plano (replica computeVeterinaryImportPlan) ───
  const animalUpdateMap  = new Map<string, {
    animalId: string; animalTag: string; animalName: string | null
    updateData: Prisma.AnimalUpdateInput; warnings: string[]
  }>()

  const reproductionsToCreate: Prisma.ReproductionCreateManyInput[]  = []
  const healthEventsToCreate:  Prisma.HealthEventCreateManyInput[]   = []
  const alertsToCreate:        Prisma.AlertCreateManyInput[]         = []
  const warnings:              string[]                               = []
  let   skippedSnapshots = 0

  // Para dedup de alertas intra-relatório
  const pendingAlertsSet = new Set(
    pendingAlerts
      .filter((a): a is typeof a & { animalId: string } => a.animalId !== null)
      .map((a) => `${a.animalId}:${a.type}`),
  )

  function addAlert(
    animalId: string, animalTag: string,
    type: AlertType, title: string, description: string,
    priority: 'HIGH' | 'MEDIUM' | 'LOW', dueDate: Date | null,
  ) {
    const key = `${animalId}:${type}`
    if (pendingAlertsSet.has(key)) return
    pendingAlertsSet.add(key)
    alertsToCreate.push({ farmId, animalId, type, title, description, priority, status: 'PENDING', dueDate: dueDate ?? undefined })
  }

  const reportDate = new Date(report.reportDate)

  for (const snap of linkedSnapshots) {
    const animal = animalMap.get(snap.animalId)
    if (!animal) {
      warnings.push(`Animal ${snap.animalId} não encontrado — snapshot ${snap.id} ignorado`)
      skippedSnapshots++
      continue
    }

    const { id: animalId, tag: animalTag, name: animalName } = animal
    const updateData: Prisma.AnimalUpdateInput = {}
    const animalWarnings: string[] = []

    // externalCode (não sobrescreve se já existe e é diferente)
    if (snap.externalCode) {
      if (!animal.externalCode) {
        updateData.externalCode = snap.externalCode
      } else if (animal.externalCode !== snap.externalCode) {
        const msg = `[${animalTag}] externalCode: atual="${animal.externalCode}", relatório="${snap.externalCode}" — não sobrescrito`
        animalWarnings.push(msg)
        warnings.push(msg)
      }
    }

    if (snap.parityNumber !== null) updateData.parityNumber = snap.parityNumber

    if (snap.lastCalvingDate) {
      const snapDate = new Date(snap.lastCalvingDate)
      const current  = animal.lastCalvingDate ? new Date(animal.lastCalvingDate) : null
      if (!current || snapDate > current) updateData.lastCalvingDate = snapDate
    }

    updateData.lastVeterinaryReportAt = reportDate
    if (snap.ccsThousand !== null) updateData.lastCcsThousand = snap.ccsThousand

    if (Object.keys(updateData).length > 0) {
      const existing = animalUpdateMap.get(animalId)
      animalUpdateMap.set(animalId, {
        animalId, animalTag, animalName: animalName ?? null,
        updateData:  existing ? { ...existing.updateData, ...updateData } : updateData,
        warnings:    existing ? [...existing.warnings, ...animalWarnings] : animalWarnings,
      })
    }

    // ── Reproduções ──────────────────────────────────────

    // INSEMINATION
    if (snap.inseminationDate) {
      const insDate = new Date(snap.inseminationDate)
      const exists  = existingRepros.some(
        (r) => r.animalId === animalId && r.type === 'INSEMINATION' &&
               isWithinDays(new Date(r.date), insDate, 7),
      )
      if (!exists) {
        reproductionsToCreate.push({
          animalId, type: 'INSEMINATION', date: insDate,
          status: 'CONFIRMED', bullName: snap.bullName ?? undefined,
        })
      }
    }

    // CALVING
    if (snap.lastCalvingDate) {
      const calvDate = new Date(snap.lastCalvingDate)
      const exists   = existingRepros.some(
        (r) => r.animalId === animalId && r.type === 'CALVING' &&
               isWithinDays(new Date(r.date), calvDate, 7),
      )
      if (!exists) {
        reproductionsToCreate.push({
          animalId, type: 'CALVING', date: calvDate, status: 'CONFIRMED',
        })
      }
    }

    // PREGNANCY_CHECK
    if ((PREGNANT_GROUPS as string[]).includes(snap.reportGroup) && snap.expectedCalvingDate) {
      const expectedDate = new Date(snap.expectedCalvingDate)
      const exists       = existingRepros.some(
        (r) => r.animalId === animalId && r.type === 'PREGNANCY_CHECK' &&
               r.status === 'CONFIRMED' && r.nextCheckDate !== null &&
               isWithinDays(new Date(r.nextCheckDate), expectedDate, 7),
      )
      if (!exists) {
        reproductionsToCreate.push({
          animalId, type: 'PREGNANCY_CHECK', date: reportDate,
          status: 'CONFIRMED', nextCheckDate: expectedDate,
          bullName: snap.bullName ?? undefined,
        })
      }
    }

    // ── Health Events ────────────────────────────────────

    if (snap.mastitisDays !== null && snap.mastitisDays > 0) {
      const existsMastitis = recentHealthEvents.some(
        (e) => e.animalId === animalId && e.type === 'MASTITIS',
      )
      if (!existsMastitis) {
        healthEventsToCreate.push({
          animalId, type: 'MASTITIS',
          description: `Mamite informada no relatório veterinário: ${snap.mastitisDays} dias`,
          occurredAt: reportDate, resolved: false,
        })
      }
    }

    if (snap.ccsThousand !== null && snap.ccsThousand >= ccsThreshold) {
      const existsCcsExam = recentHealthEvents.some(
        (e) => e.animalId === animalId && e.type === 'EXAM',
      )
      if (!existsCcsExam) {
        healthEventsToCreate.push({
          animalId, type: 'EXAM',
          description: `CCS elevada no relatório veterinário: ${snap.ccsThousand} x1000`,
          occurredAt: reportDate, resolved: false,
        })
      }
    }

    // ── Alertas ──────────────────────────────────────────

    switch (snap.reportGroup as VeterinaryReportGroup) {
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
      default: break
    }

    // Mamite (independente do grupo)
    if (snap.mastitisDays !== null && snap.mastitisDays > 0) {
      addAlert(animalId, animalTag, 'MASTITIS_FOLLOW_UP',
        `Acompanhamento de mamite — ${animalTag}`,
        `${snap.mastitisDays} dias com mamite registrada`,
        'HIGH', addDays(today, 3))
    }

    // CCS alta
    if (snap.ccsThousand !== null && snap.ccsThousand >= ccsThreshold) {
      addAlert(animalId, animalTag, 'HIGH_CCS',
        `CCS elevada — ${animalTag}`,
        `CCS: ${snap.ccsThousand} x1000 (limite: ${ccsThreshold})`,
        'MEDIUM', addDays(today, 7))
    }

    // Descarte
    if (snap.discardRecommendation) {
      addAlert(animalId, animalTag, 'DISCARD_REVIEW',
        `Revisão de descarte — ${animalTag}`,
        `Recomendação do técnico: ${snap.discardRecommendation}`,
        'MEDIUM', addDays(today, 14))
    }
  }

  const animalUpdatePlans = [...animalUpdateMap.values()]

  // ── 6. Preview do plano ───────────────────────────────
  console.log('\n══ ETAPA 5 — PREVIEW DO PLANO ════════════════════════')
  console.log(`  Animals a atualizar:      ${animalUpdatePlans.length}`)
  console.log(`  Reproduções a criar:      ${reproductionsToCreate.length}`)
  console.log(`    INSEMINATION:           ${reproductionsToCreate.filter((r) => r.type === 'INSEMINATION').length}`)
  console.log(`    CALVING:                ${reproductionsToCreate.filter((r) => r.type === 'CALVING').length}`)
  console.log(`    PREGNANCY_CHECK:        ${reproductionsToCreate.filter((r) => r.type === 'PREGNANCY_CHECK').length}`)
  console.log(`  HealthEvents a criar:     ${healthEventsToCreate.length}`)
  console.log(`    MASTITIS:               ${healthEventsToCreate.filter((e) => e.type === 'MASTITIS').length}`)
  console.log(`    EXAM (CCS):             ${healthEventsToCreate.filter((e) => e.type === 'EXAM').length}`)
  console.log(`  Alertas a criar:          ${alertsToCreate.length}`)
  const alertsByType: Record<string, number> = {}
  for (const a of alertsToCreate) {
    alertsByType[a.type] = (alertsByType[a.type] ?? 0) + 1
  }
  Object.entries(alertsByType).forEach(([t, n]) => console.log(`    ${t.padEnd(25)} ${n}`))
  console.log(`  Snapshots ignorados:      ${skippedSnapshots}`)
  console.log(`  Warnings:                 ${warnings.length}`)
  if (warnings.length > 0) warnings.forEach((w) => console.log(`    ⚠️  ${w}`))

  const allLinked = unlinkedSnapshots.length === 0
  const newStatus = allLinked ? 'IMPORTED' : 'PARTIALLY_IMPORTED'
  console.log(`  Status final previsto:    ${newStatus}`)

  if (!EXECUTE) {
    console.log('\n══════════════════════════════════════════════════════════')
    console.log('  ℹ️   Dry-run concluído. Nada foi salvo.')
    console.log('  Para executar: --execute')
    console.log('══════════════════════════════════════════════════════════\n')
    return
  }

  // ── 7. Executar em transação ──────────────────────────
  console.log('\n  Iniciando $transaction...')

  const txResult = await prisma.$transaction(async (tx) => {
    // Re-verificar status (idempotência)
    const freshReport = await tx.veterinaryReport.findFirst({
      where:  { id: REPORT_ID, farmId },
      select: { importStatus: true },
    })
    if (!freshReport) throw new Error('Relatório não encontrado na transação')
    if (freshReport.importStatus === 'IMPORTED') {
      throw new Error('Relatório já confirmado por outro processo — abortando')
    }

    // Atualizar animais
    for (const planItem of animalUpdatePlans) {
      await tx.animal.update({ where: { id: planItem.animalId }, data: planItem.updateData })
    }

    // Reproduções
    if (reproductionsToCreate.length > 0) {
      await tx.reproduction.createMany({ data: reproductionsToCreate })
    }

    // HealthEvents
    if (healthEventsToCreate.length > 0) {
      await tx.healthEvent.createMany({ data: healthEventsToCreate })
    }

    // Alertas
    if (alertsToCreate.length > 0) {
      await tx.alert.createMany({ data: alertsToCreate })
    }

    // Atualizar relatório
    const existingMeta = (report.metadata ?? {}) as Record<string, unknown>
    await tx.veterinaryReport.update({
      where: { id: REPORT_ID },
      data:  {
        importStatus:  newStatus,
        matchedRows:   linkedSnapshots.length,
        unmatchedRows: unlinkedSnapshots.length,
        metadata: ({
          ...existingMeta,
          confirmedAt: new Date().toISOString(),
          confirmedBy: userId,
          source:      'dev_script',
          summary: {
            animalsUpdated:       animalUpdatePlans.length,
            reproductionsCreated: reproductionsToCreate.length,
            healthEventsCreated:  healthEventsToCreate.length,
            alertsCreated:        alertsToCreate.length,
            skippedSnapshots,
            warnings,
          },
        }) as unknown as Prisma.InputJsonValue,
      },
    })

    return {
      animalsUpdated:       animalUpdatePlans.length,
      reproductionsCreated: reproductionsToCreate.length,
      healthEventsCreated:  healthEventsToCreate.length,
      alertsCreated:        alertsToCreate.length,
    }
  })

  console.log('  ✅ Transação concluída')

  // ── 8. AuditLog ──────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      farmId,
      userId,
      action:   'UPDATE',
      entity:   'VeterinaryReport',
      entityId: REPORT_ID,
      before:   { importStatus: report.importStatus } as Prisma.InputJsonValue,
      after:    { importStatus: newStatus }           as Prisma.InputJsonValue,
      metadata: ({
        event:  'VETERINARY_IMPORT_CONFIRMED',
        source: 'dev_script',
        summary: txResult,
      }) as unknown as Prisma.InputJsonValue,
    },
  })

  // ── 9. Resultado final ────────────────────────────────
  console.log('\n══ RESULTADO ══════════════════════════════════════════')
  console.log(`  animalsUpdated:       ${txResult.animalsUpdated}`)
  console.log(`  reproductionsCreated: ${txResult.reproductionsCreated}`)
  console.log(`  healthEventsCreated:  ${txResult.healthEventsCreated}`)
  console.log(`  alertsCreated:        ${txResult.alertsCreated}`)
  console.log(`  statusFinal:          ${newStatus}`)
  console.log(`  warnings:             ${warnings.length}`)
  console.log('══════════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('\n❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
