/**
 * scripts/import-vet-csv.ts
 *
 * Importa DADOS ZIL.pdf (10/07/2026) como DRAFT sem confirmação automática.
 *
 * Uso:
 *   npx tsx scripts/import-vet-csv.ts
 *   npx tsx scripts/import-vet-csv.ts --farmId <id>   # força uma fazenda específica
 *   npx tsx scripts/import-vet-csv.ts --dry-run        # só parse, não salva no DB
 */

import { PrismaClient }           from '@prisma/client'
import * as fs                    from 'fs'
import * as path                  from 'path'
import { parseVeterinaryCsv }     from '../src/modules/veterinary/csv-parser'
import { matchVeterinaryRowsToAnimals } from '../src/modules/veterinary/matcher'
import type { Prisma }            from '@prisma/client'

const prisma = new PrismaClient()

// ─── Config ───────────────────────────────────────────────

const CSV_PATH = path.resolve(__dirname, '../prisma/dados-zil-10-07-2026.csv')

const REPORT_META = {
  reportDate:        new Date('2026-07-10'),
  sourceSystem:      'PRODAP' as const,
  technicianName:    'Wallacy - Minas Vet Consultoria',
  externalFarmName:  '9 Saldanha',
  externalOwnerName: 'Luiz Carlos Ferreira',
  originalFilename:  'DADOS ZIL.pdf',
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  const args   = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const fidIdx = args.indexOf('--farmId')
  const forcedFarmId = fidIdx !== -1 ? args[fidIdx + 1] : undefined

  console.log('\n🐄 Importação Veterinária — DADOS ZIL 10/07/2026')
  console.log(`   Modo: ${dryRun ? '🔍 DRY RUN (não salva)' : '💾 GRAVAR como DRAFT'}`)
  console.log('')

  // ── 1. Encontrar fazenda ──────────────────────────────
  let farmId: string
  let userId: string

  if (forcedFarmId) {
    farmId = forcedFarmId
    const fu = await prisma.farmUser.findFirst({
      where: { farmId, role: { in: ['OWNER', 'MANAGER'] } },
      select: { userId: true },
    })
    if (!fu) throw new Error(`Nenhum OWNER/MANAGER para farmId ${farmId}`)
    userId = fu.userId
  } else {
    const farm = await prisma.farm.findFirst({
      where: { name: { contains: 'Saldanha', mode: 'insensitive' } },
      select: { id: true, name: true },
    })
    if (!farm) {
      // Fallback: lista todas as fazendas
      const farms = await prisma.farm.findMany({ select: { id: true, name: true }, take: 10 })
      console.error('⚠️  Fazenda "Saldanha" não encontrada. Fazendas disponíveis:')
      farms.forEach((f) => console.error(`     ${f.id}  ${f.name}`))
      console.error('\nUse --farmId <id> para forçar uma fazenda específica.')
      process.exit(1)
    }
    console.log(`✅ Fazenda: ${farm.name} (${farm.id})`)
    farmId = farm.id

    const fu = await prisma.farmUser.findFirst({
      where: { farmId, role: { in: ['OWNER', 'MANAGER'] } },
      select: { userId: true, role: true },
    })
    if (!fu) throw new Error(`Nenhum OWNER/MANAGER para fazenda ${farm.name}`)
    userId = fu.userId
    console.log(`✅ Usuário: ${userId} (${fu.role})`)
  }

  // ── 2. Ler CSV ────────────────────────────────────────
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV não encontrado: ${CSV_PATH}`)
  }
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8')
  console.log(`\n📄 CSV: ${path.basename(CSV_PATH)} (${csvContent.length} bytes)`)

  // ── 3. Parse ──────────────────────────────────────────
  const parseResult = parseVeterinaryCsv(csvContent)
  console.log(`\n📊 Parse:`)
  console.log(`   Total:    ${parseResult.totalRows}`)
  console.log(`   Válidos:  ${parseResult.validRows}`)
  console.log(`   Inválidos:${parseResult.invalidRows}`)

  if (parseResult.errors.length > 0) {
    console.log('\n⚠️  Linhas com erro:')
    parseResult.errors.forEach((e) => {
      console.log(`   Linha ${e.lineNumber}: ${e.reason}`)
      console.log(`   → ${e.rawLine.slice(0, 80)}`)
    })
  }

  // ── 4. Distribuição por grupo ─────────────────────────
  const groupCounts: Record<string, number> = {}
  for (const row of parseResult.rows) {
    groupCounts[row.reportGroup] = (groupCounts[row.reportGroup] ?? 0) + 1
  }
  console.log('\n📋 Distribuição por grupo:')
  Object.entries(groupCounts).forEach(([g, c]) => {
    console.log(`   ${g.padEnd(22)} ${c}`)
  })

  if (dryRun) {
    console.log('\n✅ Dry run concluído — nada salvo.')
    return
  }

  if (parseResult.validRows === 0) {
    throw new Error('Nenhuma linha válida no CSV. Abortar.')
  }

  // ── 5. Match com animais da fazenda ──────────────────
  console.log('\n🔗 Executando matching...')
  const matchResults = await matchVeterinaryRowsToAnimals(farmId, parseResult.rows)

  const matchedCount   = matchResults.filter((r) => r.animalId !== null).length
  const unmatchedCount = matchResults.length - matchedCount

  console.log(`   Vinculados:   ${matchedCount}`)
  console.log(`   Sem vínculo:  ${unmatchedCount}`)

  if (unmatchedCount > 0) {
    console.log('\n   Animais sem vínculo (primeiros 10):')
    matchResults
      .filter((r) => r.animalId === null)
      .slice(0, 10)
      .forEach((r) => {
        console.log(`   → ${(r.row.externalCode ?? '').padEnd(12)} ${r.row.animalName ?? ''} [${r.matchStatus}]`)
      })
  }

  // ── 6. Checar relatório duplicado ────────────────────
  const existing = await prisma.veterinaryReport.findFirst({
    where: {
      farmId,
      reportDate:    REPORT_META.reportDate,
      sourceSystem:  REPORT_META.sourceSystem,
      importStatus:  { in: ['DRAFT', 'IMPORTED', 'PARTIALLY_IMPORTED'] },
    },
    select: { id: true, importStatus: true },
  })
  if (existing) {
    console.warn(`\n⚠️  Relatório PRODAP de 10/07/2026 já existe para esta fazenda.`)
    console.warn(`   ID: ${existing.id}  Status: ${existing.importStatus}`)
    console.warn('   Abortar para evitar duplicata. Use --farmId correto ou delete o existente.')
    process.exit(1)
  }

  // ── 7. Criar DRAFT no banco ───────────────────────────
  console.log('\n💾 Criando relatório DRAFT...')

  const report = await prisma.$transaction(async (tx) => {
    const rep = await tx.veterinaryReport.create({
      data: {
        farmId,
        reportDate:        REPORT_META.reportDate,
        sourceSystem:      REPORT_META.sourceSystem,
        technicianName:    REPORT_META.technicianName,
        externalFarmName:  REPORT_META.externalFarmName,
        externalOwnerName: REPORT_META.externalOwnerName,
        originalFilename:  REPORT_META.originalFilename,
        importStatus:      'DRAFT',
        totalRows:         parseResult.totalRows,
        matchedRows:       matchedCount,
        unmatchedRows:     unmatchedCount + parseResult.invalidRows,
        importedByUserId:  userId,
        metadata:          parseResult.errors.length > 0
          ? ({ parseErrors: parseResult.errors } as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    })

    // Snapshots para linhas parseadas com sucesso
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
          rawRow: ({
            original:    mr.row.rawRow,
            matchStatus: mr.matchStatus,
            candidates:  mr.candidates,
          }) as unknown as Prisma.InputJsonValue,
        })),
      })
    }

    // Snapshots de erro de parse
    if (parseResult.errors.length > 0) {
      await tx.veterinaryAnimalSnapshot.createMany({
        data: parseResult.errors.map((err) => ({
          farmId,
          reportId:    rep.id,
          reportGroup: 'UNKNOWN' as const,
          dayMeaning:  'UNKNOWN' as const,
          isCloseUp:   false,
          rawRow: ({
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

  console.log(`\n✅ Relatório criado com sucesso!`)
  console.log(`   ID:          ${report.id}`)
  console.log(`   Status:      DRAFT`)
  console.log(`   Total:       ${report.totalRows} animais`)
  console.log(`   Vinculados:  ${report.matchedRows}`)
  console.log(`   Sem vínculo: ${report.unmatchedRows}`)
  console.log(`\n👉 Revisar em: /veterinary/import/${report.id}/review`)
}

main()
  .catch((err) => {
    console.error('\n❌ Erro:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
