/**
 * DEV ONLY — Remove animais seed/demo da Fazenda Saldanha, mantendo apenas
 * os 84 animais reais importados via relatório veterinário.
 *
 * GARANTIAS:
 *   ✅ NÃO apaga os 84 animais importados (BOV-0321→BOV-0404)
 *   ✅ NÃO apaga VeterinaryReport nem VeterinaryAnimalSnapshot do relatório real
 *   ✅ NÃO apaga reproductions/alerts/auditlogs dos 84 animais reais
 *   ✅ Aborta se qualquer animal seed tiver snapshot no relatório real
 *   ✅ Gera backup JSON antes de qualquer deleção
 *   ✅ Modo dry-run por padrão (adicione --execute para executar)
 *
 * Uso:
 *   npx tsx scripts/dev-cleanup-saldanha-seed.ts             # dry-run (preview + backup sem deletar)
 *   npx tsx scripts/dev-cleanup-saldanha-seed.ts --execute   # executa limpeza
 */
import { prisma } from '../src/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

const REAL_FARM_ID   = 'farm_saldanha'
const REAL_REPORT_ID = 'cmr5g23cf0002a94s1v0br3m6'
const DO_EXECUTE     = process.argv.includes('--execute')

const BACKUP_DIR  = path.join(process.cwd(), 'docs', 'backups')
const BACKUP_FILE = path.join(BACKUP_DIR, 'saldanha-cleanup-before-2026-07-03.json')

// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════════════')
  console.log('  DEV — LIMPEZA SEED/DEMO — FAZENDA SALDANHA')
  console.log(`  Modo:    ${DO_EXECUTE ? '⚡ EXECUTE (IRREMEDIÁVEL)' : '🔍 DRY-RUN (nenhuma alteração)'}`)
  console.log(`  DATABASE: ${(process.env.DATABASE_URL ?? 'NÃO DEFINIDA').replace(/\/\/[^:]*:[^@]*@/, '//USER:****@')}`)
  console.log('══════════════════════════════════════════════════════════════════\n')

  // ── ETAPA 1 — Identificar animais reais (via snapshots do relatório) ──────

  console.log('┌─ ETAPA 1 — IDENTIFICAR OS 84 ANIMAIS REAIS ─────────────────────')

  const report = await prisma.veterinaryReport.findUnique({
    where:  { id: REAL_REPORT_ID },
    select: { id: true, farmId: true, importStatus: true, totalRows: true, matchedRows: true, unmatchedRows: true },
  })
  if (!report) {
    console.error(`│  ❌ ABORT: Relatório ${REAL_REPORT_ID} não encontrado neste banco.`)
    process.exit(1)
  }
  console.log(`│  Relatório: ${report.id}`)
  console.log(`│  farmId:    ${report.farmId}  |  status: ${report.importStatus}`)
  console.log(`│  rows: total=${report.totalRows}  matched=${report.matchedRows}  unmatched=${report.unmatchedRows}`)

  if (report.farmId !== REAL_FARM_ID) {
    console.error(`│  ❌ ABORT: O relatório pertence a ${report.farmId}, esperado ${REAL_FARM_ID}.`)
    process.exit(1)
  }

  const snapshotsLinked = await prisma.veterinaryAnimalSnapshot.findMany({
    where:  { reportId: REAL_REPORT_ID, animalId: { not: null } },
    select: { animalId: true },
  })
  const realAnimalIds = new Set(snapshotsLinked.map((s) => s.animalId as string))

  console.log(`│  Snapshots vinculados: ${snapshotsLinked.length}`)
  console.log(`│  IDs únicos de animais reais: ${realAnimalIds.size}`)

  if (realAnimalIds.size === 0) {
    console.error('│  ❌ ABORT: Nenhum snapshot vinculado no relatório — importação não foi executada?')
    process.exit(1)
  }

  // Verificar que todos existem e pertencem à farm correta
  const realAnimals = await prisma.animal.findMany({
    where:  { id: { in: [...realAnimalIds] }, farmId: REAL_FARM_ID },
    select: { id: true, tag: true, externalCode: true, status: true, category: true },
    orderBy: { tag: 'asc' },
  })

  if (realAnimals.length !== realAnimalIds.size) {
    console.error(`│  ❌ ABORT: Esperados ${realAnimalIds.size} animais reais, encontrados ${realAnimals.length} em farm_saldanha.`)
    process.exit(1)
  }

  const tagFirst = realAnimals[0]?.tag ?? '?'
  const tagLast  = realAnimals[realAnimals.length - 1]?.tag ?? '?'
  console.log(`│  Tags dos animais reais: ${tagFirst} → ${tagLast}`)
  console.log(`│  ✅ ${realAnimals.length} animais reais identificados\n`)

  // ── ETAPA 2 — Identificar animais seed/demo ───────────────────────────────

  console.log('┌─ ETAPA 2 — IDENTIFICAR ANIMAIS SEED/DEMO ───────────────────────')

  const allFarmAnimals = await prisma.animal.findMany({
    where:  { farmId: REAL_FARM_ID },
    select: {
      id: true, tag: true, name: true, externalCode: true,
      status: true, category: true, breed: true, sex: true,
      createdAt: true, updatedAt: true,
      motherId: true, fatherId: true,
    },
    orderBy: { tag: 'asc' },
  })

  const seedAnimals = allFarmAnimals.filter((a) => !realAnimalIds.has(a.id))
  const seedAnimalIds = seedAnimals.map((a) => a.id)
  const seedAnimalIdSet = new Set(seedAnimalIds)

  console.log(`│  Total de animais na farm:    ${allFarmAnimals.length}`)
  console.log(`│  Animais reais (importados):  ${realAnimals.length}`)
  console.log(`│  Animais seed/demo:           ${seedAnimals.length}`)

  if (seedAnimals.length === 0) {
    console.log('│\n│  ✅ Nenhum animal seed encontrado — banco já está limpo!')
    process.exit(0)
  }

  // Amostrar seed animals
  console.log('│')
  console.log('│  Amostra (primeiros 10 seeds):')
  seedAnimals.slice(0, 10).forEach((a) =>
    console.log(`│    tag=${a.tag.padEnd(12)} name="${(a.name ?? '').padEnd(20)}" ext=${a.externalCode ?? 'null'} status=${a.status}`),
  )
  if (seedAnimals.length > 10) console.log(`│    ... +${seedAnimals.length - 10} mais`)
  console.log('')

  // ── ETAPA 3 — Verificação de segurança ───────────────────────────────────

  console.log('┌─ ETAPA 3 — VERIFICAÇÃO DE SEGURANÇA ────────────────────────────')

  // 3a. Nenhum seed animal deve ter snapshot no relatório real
  const seedSnapshotCount = await prisma.veterinaryAnimalSnapshot.count({
    where: {
      reportId: REAL_REPORT_ID,
      animalId: { in: seedAnimalIds },
    },
  })
  if (seedSnapshotCount > 0) {
    console.error(`│  ❌ ABORT: ${seedSnapshotCount} snapshot(s) do relatório real apontam para animais seed.`)
    console.error('│  Isso indica que a identificação de "reais vs seed" está errada. Revisar manualmente.')
    process.exit(1)
  }
  console.log(`│  ✅ Nenhum snapshot do relatório real aponta para animais seed`)

  // 3b. Nenhum animal real deve ser filho de seed (motherId/fatherId)
  const realAnimalsWithSeedParent = realAnimals.filter(() => false) // preenchido abaixo
  const realAnimalsData = await prisma.animal.findMany({
    where: {
      id:       { in: [...realAnimalIds] },
      OR: [
        { motherId: { in: seedAnimalIds } },
        { fatherId: { in: seedAnimalIds } },
      ],
    },
    select: { id: true, tag: true, motherId: true, fatherId: true },
  })
  if (realAnimalsData.length > 0) {
    console.log(`│  ⚠️  ${realAnimalsData.length} animais reais têm motherId/fatherId apontando para seeds — serão nulados`)
    realAnimalsData.forEach((a) =>
      console.log(`│    tag=${a.tag}  motherId=${a.motherId ?? 'null'}  fatherId=${a.fatherId ?? 'null'}`),
    )
  } else {
    console.log('│  ✅ Nenhum animal real referencia seeds como pai/mãe')
  }

  // 3c. Contar referências self (seeds referenciando outros seeds como pai/mãe)
  const seedsWithSeedParent = seedAnimals.filter(
    (a) => (a.motherId && seedAnimalIdSet.has(a.motherId)) || (a.fatherId && seedAnimalIdSet.has(a.fatherId)),
  )
  console.log(`│  Seeds com referência pai/mãe seed: ${seedsWithSeedParent.length} (serão nulados antes de deletar)`)
  console.log('')

  // ── ETAPA 4 — Contar dados relacionados ──────────────────────────────────

  console.log('┌─ ETAPA 4 — DADOS RELACIONADOS AOS ANIMAIS SEED ─────────────────')

  const [
    cntReproductions,
    cntHealthEvents,
    cntAlerts,
    cntWeightRecords,
    cntMilkRecords,
    cntMilkingParticipants,
    cntAnimalPhotos,
    cntFeedConsumptions,
    cntSnapshots,
  ] = await Promise.all([
    prisma.reproduction.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.healthEvent.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.alert.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.weightRecord.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.milkRecord.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.milkingSessionParticipant.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.animalPhoto.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.animalFeedConsumption.count({ where: { animalId: { in: seedAnimalIds } } }),
    prisma.veterinaryAnimalSnapshot.count({ where: { animalId: { in: seedAnimalIds } } }),
  ])

  // AuditLog usa entityId (string genérico, sem FK para Animal) — não bloqueia delete
  const cntAuditLogs = await prisma.auditLog.count({
    where: { entity: 'Animal', entityId: { in: seedAnimalIds } },
  })

  console.log(`│  Animals seed:              ${seedAnimals.length}`)
  console.log(`│  Reproductions (CASCADE):   ${cntReproductions}`)
  console.log(`│  HealthEvents (CASCADE):    ${cntHealthEvents}`)
  console.log(`│  Alerts (animalId SetNull): ${cntAlerts}`)
  console.log(`│  AuditLogs (entityId only): ${cntAuditLogs} — ficam no banco (sem FK)`)
  console.log(`│  WeightRecords (CASCADE):   ${cntWeightRecords}`)
  console.log(`│  MilkRecords (CASCADE):     ${cntMilkRecords}`)
  console.log(`│  MilkParticipants (CASC):   ${cntMilkingParticipants}`)
  console.log(`│  AnimalPhotos (CASCADE):    ${cntAnimalPhotos}`)
  console.log(`│  FeedConsumptions (CASC):   ${cntFeedConsumptions}`)
  console.log(`│  VetSnapshots (seed?):      ${cntSnapshots}`)
  if (cntSnapshots > 0) {
    console.log('│  ⚠️  Alguns seeds têm snapshots (não do relatório real) — animalId será nulado via SetNull')
  }
  console.log('')

  // ── ETAPA 5 — Estado esperado pós-limpeza ────────────────────────────────

  console.log('┌─ ETAPA 5 — ESTADO ESPERADO PÓS-LIMPEZA ─────────────────────────')

  const [cntRealRepros, cntRealAlerts] = await Promise.all([
    prisma.reproduction.count({ where: { animalId: { in: [...realAnimalIds] } } }),
    prisma.alert.count({ where: { animalId: { in: [...realAnimalIds] } } }),
  ])

  console.log(`│  Animais que ficarão:       ${realAnimals.length}  (${tagFirst} → ${tagLast})`)
  console.log(`│  Reproductions que ficarão: ${cntRealRepros}`)
  console.log(`│  Alerts que ficarão:        ${cntRealAlerts}`)
  console.log(`│  VetReport:                 PRESERVADO (${REAL_REPORT_ID})`)
  console.log(`│  VetSnapshots do report:    PRESERVADOS (${snapshotsLinked.length})`)
  console.log('')

  // ── ETAPA 6 — Backup JSON ─────────────────────────────────────────────────

  console.log('┌─ ETAPA 6 — BACKUP JSON ──────────────────────────────────────────')

  const backupData = {
    generatedAt:    new Date().toISOString(),
    dryRun:         !DO_EXECUTE,
    farmId:         REAL_FARM_ID,
    reportId:       REAL_REPORT_ID,
    summary: {
      totalAnimalsBeforeCleanup: allFarmAnimals.length,
      realAnimalsKept:           realAnimals.length,
      seedAnimalsToRemove:       seedAnimals.length,
      reproductionsToRemove:     cntReproductions,
      healthEventsToRemove:      cntHealthEvents,
      alertsToRemove:            cntAlerts,
      auditLogsEntityIds:        cntAuditLogs,   // ficam no banco (entityId, sem FK real)
      weightRecordsToRemove:     cntWeightRecords,
      milkRecordsToRemove:       cntMilkRecords,
      milkParticipantsToRemove:  cntMilkingParticipants,
      animalPhotosToRemove:      cntAnimalPhotos,
      feedConsumptionsToRemove:  cntFeedConsumptions,
    },
    realAnimals: realAnimals.map((a) => ({
      id: a.id, tag: a.tag, externalCode: a.externalCode, status: a.status, category: a.category,
    })),
    seedAnimals: seedAnimals.map((a) => ({
      id: a.id, tag: a.tag, name: a.name, externalCode: a.externalCode,
      status: a.status, category: a.category, breed: a.breed, sex: a.sex,
      motherId: a.motherId, fatherId: a.fatherId,
      createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString(),
    })),
    realAnimalsWithSeedParentRef: realAnimalsData.map((a) => ({
      id: a.id, tag: a.tag, motherId: a.motherId, fatherId: a.fatherId,
    })),
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }

  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backupData, null, 2), 'utf-8')
  console.log(`│  ✅ Backup gerado em: ${BACKUP_FILE}`)
  console.log('')

  // ── PARAR AQUI SE DRY-RUN ────────────────────────────────────────────────

  if (!DO_EXECUTE) {
    console.log('══ DRY-RUN COMPLETO ══════════════════════════════════════════════════')
    console.log(`  ${seedAnimals.length} animais seed identificados, NÃO foram deletados.`)
    console.log(`  Backup salvo em: ${path.basename(BACKUP_FILE)}`)
    console.log('')
    console.log('  Para executar a limpeza:')
    console.log('    npx tsx scripts/dev-cleanup-saldanha-seed.ts --execute')
    console.log('══════════════════════════════════════════════════════════════════════\n')
    return
  }

  // ── ETAPA 7 — EXECUÇÃO ────────────────────────────────────────────────────

  console.log('┌─ ETAPA 7 — EXECUTANDO LIMPEZA ──────────────────────────────────')
  console.log('│  ⚡ MODO EXECUTE — alterações serão gravadas no banco!')
  console.log('')

  // 7a. Nular motherId/fatherId nos animais REAIS que referenciam seeds
  if (realAnimalsData.length > 0) {
    const realParentFixResult = await prisma.animal.updateMany({
      where: {
        id: { in: realAnimalsData.map((a) => a.id) },
        OR: [
          { motherId: { in: seedAnimalIds } },
          { fatherId: { in: seedAnimalIds } },
        ],
      },
      data: { motherId: null, fatherId: null },
    })
    console.log(`│  ✅ 7a. ${realParentFixResult.count} animais reais com refs seed → motherId/fatherId nulados`)
  } else {
    console.log('│  ✅ 7a. Nenhum animal real com ref seed — pulado')
  }

  // 7b. Nular motherId/fatherId nos próprios seeds (self-refs seed→seed)
  if (seedAnimals.length > 0) {
    const seedParentFixResult = await prisma.animal.updateMany({
      where: {
        id: { in: seedAnimalIds },
        OR: [
          { motherId: { not: null } },
          { fatherId: { not: null } },
        ],
      },
      data: { motherId: null, fatherId: null },
    })
    console.log(`│  ✅ 7b. ${seedParentFixResult.count} seeds com motherId/fatherId → nulados`)
  }

  // 7c. Deletar Alerts dos seeds explicitamente (Prisma default SetNull para nullable FK,
  //     mas deletar é mais limpo para dev — evita alerts órfãos sem animal)
  const alertsDeleted = await prisma.alert.deleteMany({
    where: { animalId: { in: seedAnimalIds } },
  })
  console.log(`│  ✅ 7c. ${alertsDeleted.count} Alerts dos seeds deletados`)

  // 7d. AuditLog: usa entityId (string, sem FK real para Animal) — não bloqueia delete
  //     Os audit logs dos seeds permanecerão no banco com entity='Animal' e entityId=seedId.
  //     Em dev isso é aceitável; não há FK constraint a tratar.
  console.log(`│  ℹ️  7d. AuditLogs dos seeds: ${cntAuditLogs} registros ficam no banco (entityId, sem FK — OK em dev)`)

  // 7e. Deletar VeterinaryAnimalSnapshots dos seeds (de OUTROS relatórios, se existirem)
  //     (snapshots do relatório real com animalId=seed foram bloqueados na verificação 3a)
  if (cntSnapshots > 0) {
    const snapshotsDeleted = await prisma.veterinaryAnimalSnapshot.deleteMany({
      where: { animalId: { in: seedAnimalIds } },
    })
    console.log(`│  ✅ 7e. ${snapshotsDeleted.count} VetSnapshots de outros reports (seed) deletados`)
  } else {
    console.log('│  ✅ 7e. Nenhum VetSnapshot seed para deletar — pulado')
  }

  // 7f. Deletar os animais seed — cascades automáticos cuidam de:
  //     Reproduction, HealthEvent, WeightRecord, MilkRecord,
  //     MilkingSessionParticipant, AnimalPhoto, AnimalFeedConsumption
  const BATCH_SIZE = 100
  let totalDeleted = 0
  for (let i = 0; i < seedAnimalIds.length; i += BATCH_SIZE) {
    const batch = seedAnimalIds.slice(i, i + BATCH_SIZE)
    const result = await prisma.animal.deleteMany({
      where: { id: { in: batch } },
    })
    totalDeleted += result.count
    console.log(`│  ✅ 7f. Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${result.count} animais deletados`)
  }
  console.log(`│  ✅ 7f. Total: ${totalDeleted} animais seed deletados`)
  console.log('')

  // ── ETAPA 8 — VALIDAÇÃO PÓS-LIMPEZA ─────────────────────────────────────

  console.log('┌─ ETAPA 8 — VALIDAÇÃO PÓS-LIMPEZA ──────────────────────────────')

  const [
    postTotalAnimals,
    postActiveAnimals,
    postRealAnimals,
    postRealRepros,
    postRealAlerts,
    postRealSnapshots,
    postFarmAlerts,
    postReport,
  ] = await Promise.all([
    prisma.animal.count({ where: { farmId: REAL_FARM_ID } }),
    prisma.animal.count({ where: { farmId: REAL_FARM_ID, status: 'ACTIVE' } }),
    prisma.animal.count({ where: { id: { in: [...realAnimalIds] } } }),
    prisma.reproduction.count({ where: { animalId: { in: [...realAnimalIds] } } }),
    prisma.alert.count({ where: { animalId: { in: [...realAnimalIds] } } }),
    prisma.veterinaryAnimalSnapshot.count({ where: { reportId: REAL_REPORT_ID, animalId: { not: null } } }),
    prisma.alert.count({ where: { farmId: REAL_FARM_ID } }),
    prisma.veterinaryReport.findUnique({
      where:  { id: REAL_REPORT_ID },
      select: { id: true, importStatus: true },
    }),
  ])

  const checks = {
    'Total animais na farm = 84':           postTotalAnimals === realAnimals.length,
    'Animais ativos = 84':                  postActiveAnimals === realAnimals.length,
    'Todos os 84 reais preservados':        postRealAnimals === realAnimals.length,
    'Reproductions dos reais preservadas':  postRealRepros === cntRealRepros,
    'Alerts dos reais preservados':         postRealAlerts === cntRealAlerts,
    'VetSnapshots do relatório preservados':postRealSnapshots === snapshotsLinked.length,
    'Total alerts farm = real alerts':      postFarmAlerts === cntRealAlerts,
    'Relatório ainda existe (IMPORTED)':    postReport?.importStatus === 'IMPORTED',
  }

  console.log('')
  let allPassed = true
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`│  ${passed ? '✅' : '❌'} ${check}`)
    if (!passed) allPassed = false
  }

  console.log('')
  console.log(`│  Totais pós-limpeza:`)
  console.log(`│    Animais na farm:    ${postTotalAnimals}`)
  console.log(`│    Animais ativos:     ${postActiveAnimals}`)
  console.log(`│    Reproductions:      ${postRealRepros}`)
  console.log(`│    Alerts:             ${postFarmAlerts}`)
  console.log(`│    VetSnapshots:       ${postRealSnapshots}`)
  console.log(`│    Relatório status:   ${postReport?.importStatus ?? 'NÃO ENCONTRADO'}`)
  console.log('')

  if (allPassed) {
    console.log('══ LIMPEZA CONCLUÍDA COM SUCESSO ═════════════════════════════════════')
    console.log(`  ✅ ${seedAnimals.length} animais seed/demo removidos`)
    console.log(`  ✅ ${realAnimals.length} animais reais preservados (${tagFirst} → ${tagLast})`)
    console.log(`  ✅ Relatório ${REAL_REPORT_ID} intacto`)
  } else {
    console.log('══ ATENÇÃO — ALGUMAS VERIFICAÇÕES FALHARAM ═══════════════════════════')
    console.log('  Revisar os itens marcados com ❌ acima.')
  }
  console.log('══════════════════════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('\n❌ Erro fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
