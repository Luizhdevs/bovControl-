'use server'

import { revalidatePath }      from 'next/cache'
import { auth }                from '@/lib/auth'
import { getActiveFarm }       from '@/lib/active-farm'
import { requireFarmAccess }   from '@/lib/permissions'
import { auditCreate }         from '@/lib/audit'
import { prisma }              from '@/lib/prisma'
import { parseVeterinaryCsv }  from './csv-parser'
import { matchVeterinaryRowsToAnimals } from './matcher'
import { createVeterinaryReportDraftSchema } from './schemas'
import type { ActionResult }   from './types'
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

// ─── Sprint 9.1C — confirmVeterinaryImport (a implementar) ─
// ─── Sprint 9.1D — deleteVeterinaryReport (a implementar) ──
// ─── Sprint 9.1E — updateSnapshotAnimalLink (a implementar) ─
