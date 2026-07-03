'use server'

import { revalidatePath }      from 'next/cache'
import { auth }                from '@/lib/auth'
import { getActiveFarm }       from '@/lib/active-farm'
import { requireFarmAccess }   from '@/lib/permissions'
import { auditCreate, auditUpdate } from '@/lib/audit'
import { prisma }              from '@/lib/prisma'
import { parseVeterinaryCsv }  from './csv-parser'
import { matchVeterinaryRowsToAnimals } from './matcher'
import { createVeterinaryReportDraftSchema } from './schemas'
import { computeVeterinaryImportPlan } from './import-engine'
import type { ActionResult, VeterinaryImportConfirmResult } from './types'
import type { Prisma }         from '@prisma/client'

// ─── Sprint 9.1B — Criar draft de relatório via CSV ───────

export async function createVeterinaryReportDraft(
  input: unknown,
): Promise<ActionResult<{ reportId: string }>> {
  try {
    // ── Auth ───────────────────────────────────────────────
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Nenhuma fazenda ativa' }
    const { farmId } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    // ── Validate input ─────────────────────────────────────
    const parsed = createVeterinaryReportDraftSchema.safeParse(input)
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos'
      return { success: false, error: msg }
    }
    const {
      reportDate, sourceSystem, technicianName, externalFarmName,
      externalOwnerName, originalFilename, csvContent,
    } = parsed.data

    // ── Parse CSV ──────────────────────────────────────────
    const parseResult = parseVeterinaryCsv(csvContent)

    if (parseResult.validRows === 0 && parseResult.invalidRows === 0) {
      return { success: false, error: 'CSV vazio ou sem linhas de dados reconhecíveis' }
    }

    // ── Match automático ───────────────────────────────────
    const matchResults = await matchVeterinaryRowsToAnimals(farmId, parseResult.rows)

    const matchedCount   = matchResults.filter((r) => r.animalId !== null).length
    const unmatchedCount = matchResults.length - matchedCount
    const totalRows      = parseResult.totalRows

    // ── Transaction: report + snapshots ───────────────────
    const report = await prisma.$transaction(async (tx) => {
      const rep = await tx.veterinaryReport.create({
        data: {
          farmId,
          reportDate,
          sourceSystem,
          technicianName:    technicianName    ?? null,
          externalFarmName:  externalFarmName  ?? null,
          externalOwnerName: externalOwnerName ?? null,
          originalFilename,
          importStatus:      'DRAFT',
          totalRows,
          matchedRows:       matchedCount,
          unmatchedRows:     unmatchedCount + parseResult.invalidRows,
          importedByUserId:  session.user.id,
          metadata:          parseResult.invalidRows > 0
            ? ({ parseErrors: parseResult.errors } as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      })

      // ── Snapshots for parsed rows ──────────────────────
      if (matchResults.length > 0) {
        await tx.veterinaryAnimalSnapshot.createMany({
          data: matchResults.map((mr) => ({
            farmId,
            reportId:              rep.id,
            animalId:              mr.animalId,
            externalCode:          mr.row.externalCode,
            animalName:            mr.row.animalName,
            reportGroup:           mr.row.reportGroup,
            rawGroupLabel:         mr.row.rawGroupLabel,
            parityNumber:          mr.row.parityNumber,
            lastCalvingDate:       mr.row.lastCalvingDate,
            rp:                    mr.row.rp,
            sx:                    mr.row.sx,
            inseminationDate:      mr.row.inseminationDate,
            inseminationNumber:    mr.row.inseminationNumber,
            reportDays:            mr.row.reportDays,
            dayMeaning:            mr.row.dayMeaning,
            bullName:              mr.row.bullName,
            expectedCalvingDate:   mr.row.expectedCalvingDate,
            milkPeak:              mr.row.milkPeak,
            milkCurrent:           mr.row.milkCurrent,
            breed:                 mr.row.breed,
            fatherName:            mr.row.fatherName,
            cScore:                mr.row.cScore,
            tScore:                mr.row.tScore,
            occurrence:            mr.row.occurrence,
            discardRecommendation: mr.row.discardRecommendation,
            mastitisDays:          mr.row.mastitisDays,
            ccsThousand:           mr.row.ccsThousand,
            isCloseUp:             mr.row.isCloseUp,
            rawRow:                ({
              original:    mr.row.rawRow,
              matchStatus: mr.matchStatus,
              candidates:  mr.candidates,
            }) as unknown as Prisma.InputJsonValue,
          })),
        })
      }

      // ── Minimal snapshots for parse error rows ─────────
      if (parseResult.errors.length > 0) {
        await tx.veterinaryAnimalSnapshot.createMany({
          data: parseResult.errors.map((err) => ({
            farmId,
            reportId:    rep.id,
            reportGroup: 'UNKNOWN' as const,
            dayMeaning:  'UNKNOWN' as const,
            isCloseUp:   false,
            rawRow:      ({
              original:    { '_linha_original': err.rawLine },
              matchStatus: 'ERROR',
              candidates:  [],
              parseError:  err.reason,
            }) as unknown as Prisma.InputJsonValue,
          })),
        })
      }

      return rep
    })

    // ── AuditLog (fire-and-forget) ─────────────────────────
    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'VeterinaryReport',
      entityId: report.id,
      metadata: {
        event:         'IMPORT_DRAFT',
        source:        'web',
        phase:         'draft',
        sourceSystem,
        reportDate:    reportDate.toISOString(),
        filename:      originalFilename,
        totalRows,
        validRows:     parseResult.validRows,
        invalidRows:   parseResult.invalidRows,
        matchedRows:   matchedCount,
        unmatchedRows: unmatchedCount,
      },
    })

    revalidatePath('/veterinary/import')

    return { success: true, data: { reportId: report.id } }
  } catch (e) {
    if (e instanceof Error && e.message === 'Acesso negado') {
      return { success: false, error: 'Apenas gerentes e proprietários podem importar relatórios' }
    }
    console.error('[veterinary] createVeterinaryReportDraft error:', e)
    return { success: false, error: 'Erro interno ao processar o relatório' }
  }
}

// ─── Sprint 9.1C — Buscar animais para o link editor ────────

export async function searchFarmAnimals(
  query: string,
): Promise<ActionResult<{ id: string; tag: string; name: string | null; externalCode: string | null }[]>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Nenhuma fazenda ativa' }

    const q = query.trim()
    if (q.length < 2) return { success: true, data: [] }

    const animals = await prisma.animal.findMany({
      where: {
        farmId: activeFarm.farmId,
        status: 'ACTIVE',
        OR: [
          { tag:          { contains: q, mode: 'insensitive' } },
          { name:         { contains: q, mode: 'insensitive' } },
          { externalCode: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, tag: true, name: true, externalCode: true },
      take:   10,
      orderBy: { tag: 'asc' },
    })

    return { success: true, data: animals }
  } catch (e) {
    console.error('[veterinary] searchFarmAnimals error:', e)
    return { success: false, error: 'Erro ao buscar animais' }
  }
}

// ─── Sprint 9.1C — Vínculo manual snapshot ↔ animal ─────────

export async function updateVeterinarySnapshotAnimalLink(
  snapshotId: string,
  animalId:   string | null,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }

    const activeFarm = await getActiveFarm(session.user.id)
    if (!activeFarm) return { success: false, error: 'Nenhuma fazenda ativa' }
    const { farmId } = activeFarm

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    // Verificar que o snapshot pertence à fazenda ativa
    const snapshot = await prisma.veterinaryAnimalSnapshot.findFirst({
      where:  { id: snapshotId, farmId },
      select: { id: true, animalId: true, rawRow: true, reportId: true },
    })
    if (!snapshot) return { success: false, error: 'Snapshot não encontrado' }

    // Se vinculando, verificar que o animal também pertence à fazenda ativa
    if (animalId) {
      const animal = await prisma.animal.findFirst({
        where:  { id: animalId, farmId },
        select: { id: true },
      })
      if (!animal) return { success: false, error: 'Animal não encontrado nesta fazenda' }
    }

    const prevAnimalId  = snapshot.animalId
    const rawRow        = (snapshot.rawRow ?? {}) as Record<string, unknown>
    const newMatchStatus = animalId ? 'MANUAL_MATCH' : 'LINK_REMOVED'

    const updatedRaw = {
      ...rawRow,
      matchStatus: newMatchStatus,
      ...(prevAnimalId && prevAnimalId !== animalId
        ? { previousAnimalId: prevAnimalId }
        : {}),
    } as unknown as Prisma.InputJsonValue

    await prisma.veterinaryAnimalSnapshot.update({
      where: { id: snapshotId },
      data:  { animalId, rawRow: updatedRaw },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'VeterinaryAnimalSnapshot',
      entityId: snapshotId,
      before:   { animalId: prevAnimalId, matchStatus: rawRow['matchStatus'] as string | undefined },
      after:    { animalId, matchStatus: newMatchStatus },
      metadata: ({
        event:    'VETERINARY_SNAPSHOT_LINK_UPDATED',
        reportId: snapshot.reportId,
      }) as unknown as Prisma.InputJsonValue,
    })

    revalidatePath(`/veterinary/import/${snapshot.reportId}/review`)

    return { success: true, data: undefined }
  } catch (e) {
    if (e instanceof Error && e.message === 'Acesso negado') {
      return { success: false, error: 'Apenas gerentes e proprietários podem editar vínculos' }
    }
    console.error('[veterinary] updateVeterinarySnapshotAnimalLink error:', e)
    return { success: false, error: 'Erro ao atualizar vínculo' }
  }
}

// ─── Sprint 9.1C — Confirmar importação ──────────────────────

export async function confirmVeterinaryImport(
  reportId: string,
): Promise<ActionResult<VeterinaryImportConfirmResult>> {
  try {
    // ── Auth ────────────────────────────────────────────────
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: 'Não autenticado' }
    const userId = session.user.id

    const activeFarm = await getActiveFarm(userId)
    if (!activeFarm) return { success: false, error: 'Nenhuma fazenda ativa' }
    const { farmId } = activeFarm

    await requireFarmAccess(userId, farmId, 'MANAGER')

    // ── Buscar relatório (farmId obrigatório) ─────────────
    const report = await prisma.veterinaryReport.findFirst({
      where: { id: reportId, farmId },
    })
    if (!report) return { success: false, error: 'Relatório não encontrado' }

    // ── Idempotência: não confirmar novamente ─────────────
    if (report.importStatus === 'IMPORTED') {
      return { success: false, error: 'Este relatório já foi confirmado.' }
    }
    if (report.importStatus === 'FAILED') {
      return { success: false, error: 'Relatório marcado como falha — não pode ser confirmado.' }
    }

    // ── Carregar configurações da fazenda ─────────────────
    const farmSettings = await prisma.farmSettings.findFirst({
      where:  { farmId },
      select: { ccsAlertThreshold: true, emptyDaysAlert: true },
    })

    // ── Computar plano de importação (leitura) ────────────
    const plan = await computeVeterinaryImportPlan(
      report,
      farmSettings ?? { ccsAlertThreshold: null, emptyDaysAlert: null },
    )

    // ── Executar em transação atômica ─────────────────────
    const txResult = await prisma.$transaction(async (tx) => {
      // Re-verificar status dentro da transação (race condition)
      const freshReport = await tx.veterinaryReport.findFirst({
        where:  { id: reportId, farmId },
        select: { importStatus: true },
      })
      if (!freshReport) throw new Error('Relatório não encontrado na transação')
      if (freshReport.importStatus === 'IMPORTED') {
        throw new Error('Relatório já confirmado por outro processo')
      }

      // Animal updates
      for (const planItem of plan.animalUpdatePlans) {
        await tx.animal.update({
          where: { id: planItem.animalId },
          data:  planItem.updateData,
        })
      }

      // Reproductions
      if (plan.reproductionsToCreate.length > 0) {
        await tx.reproduction.createMany({ data: plan.reproductionsToCreate })
      }

      // HealthEvents
      if (plan.healthEventsToCreate.length > 0) {
        await tx.healthEvent.createMany({ data: plan.healthEventsToCreate })
      }

      // Alerts
      if (plan.alertsToCreate.length > 0) {
        await tx.alert.createMany({ data: plan.alertsToCreate })
      }

      // Atualizar relatório
      const allLinked  = plan.unlinkedSnapshots.length === 0
      const newStatus  = allLinked ? 'IMPORTED' : 'PARTIALLY_IMPORTED'
      const existingMeta = (report.metadata ?? {}) as Record<string, unknown>

      await tx.veterinaryReport.update({
        where: { id: reportId },
        data:  {
          importStatus:  newStatus,
          matchedRows:   plan.linkedSnapshots.length,
          unmatchedRows: plan.unlinkedSnapshots.length,
          metadata: ({
            ...existingMeta,
            confirmedAt: new Date().toISOString(),
            confirmedBy: userId,
            summary: {
              animalsUpdated:       plan.animalUpdatePlans.length,
              reproductionsCreated: plan.reproductionsToCreate.length,
              healthEventsCreated:  plan.healthEventsToCreate.length,
              alertsCreated:        plan.alertsToCreate.length,
              skippedSnapshots:     plan.skippedSnapshots,
              warnings:             plan.warnings,
            },
          }) as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        animalsUpdated:       plan.animalUpdatePlans.length,
        reproductionsCreated: plan.reproductionsToCreate.length,
        healthEventsCreated:  plan.healthEventsToCreate.length,
        alertsCreated:        plan.alertsToCreate.length,
        skippedSnapshots:     plan.skippedSnapshots,
        warnings:             plan.warnings,
        newStatus,
      }
    })

    // ── AuditLog (fire-and-forget) ────────────────────────
    auditUpdate({
      farmId,
      userId,
      entity:   'VeterinaryReport',
      entityId: reportId,
      before:   { importStatus: report.importStatus },
      after:    { importStatus: txResult.newStatus },
      metadata: ({
        event:  'VETERINARY_IMPORT_CONFIRMED',
        source: 'web',
        summary: {
          animalsUpdated:       txResult.animalsUpdated,
          reproductionsCreated: txResult.reproductionsCreated,
          healthEventsCreated:  txResult.healthEventsCreated,
          alertsCreated:        txResult.alertsCreated,
        },
      }) as unknown as Prisma.InputJsonValue,
    })

    revalidatePath(`/veterinary/import/${reportId}/review`)
    revalidatePath('/veterinary/import')
    revalidatePath('/')

    return {
      success: true,
      data: {
        animalsUpdated:       txResult.animalsUpdated,
        reproductionsCreated: txResult.reproductionsCreated,
        healthEventsCreated:  txResult.healthEventsCreated,
        alertsCreated:        txResult.alertsCreated,
        skippedSnapshots:     txResult.skippedSnapshots,
        warnings:             txResult.warnings,
      },
    }
  } catch (e) {
    if (e instanceof Error && e.message === 'Acesso negado') {
      return { success: false, error: 'Apenas gerentes e proprietários podem confirmar importações' }
    }
    if (e instanceof Error && e.message.includes('já confirmado')) {
      return { success: false, error: 'Este relatório já foi confirmado.' }
    }
    console.error('[veterinary] confirmVeterinaryImport error:', e)
    return { success: false, error: 'Erro interno ao confirmar importação' }
  }
}

// ─── Sprint 9.1D — deleteVeterinaryReport (a implementar) ──
