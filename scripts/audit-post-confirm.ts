/**
 * scripts/audit-post-confirm.ts — Auditoria pós-confirmação Fazenda Saldanha
 */
import { prisma } from '../src/lib/prisma'

const REPORT_ID = 'cmr5g23cf0002a94s1v0br3m6'

async function main() {
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  AUDITORIA PÓS-CONFIRMAÇÃO — Fazenda Saldanha')
  console.log('══════════════════════════════════════════════════════\n')

  const report = await prisma.veterinaryReport.findUnique({ where: { id: REPORT_ID } })
  if (!report) throw new Error('Relatório não encontrado')
  const { farmId } = report

  // ── Snapshots ─────────────────────────────────────────
  const snapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where: { reportId: REPORT_ID, farmId },
    select: { id: true, animalId: true },
  })
  const linkedAnimalIds = [...new Set(
    snapshots.filter((s) => s.animalId !== null).map((s) => s.animalId as string),
  )]

  // ── Animais ───────────────────────────────────────────
  const animals = await prisma.animal.findMany({
    where:  { id: { in: linkedAnimalIds }, farmId },
    select: {
      id: true, tag: true, externalCode: true, name: true,
      parityNumber: true, lastCalvingDate: true,
      lastVeterinaryReportAt: true, lastCcsThousand: true,
      category: true,
    },
    orderBy: { tag: 'asc' },
  })

  const withExtCode        = animals.filter((a) => a.externalCode !== null).length
  const withLastVetAt      = animals.filter((a) => a.lastVeterinaryReportAt !== null).length
  const withParityNumber   = animals.filter((a) => a.parityNumber !== null).length
  const withLastCalving    = animals.filter((a) => a.lastCalvingDate !== null).length
  const withCcs            = animals.filter((a) => a.lastCcsThousand !== null).length
  const heifers            = animals.filter((a) => a.category === 'HEIFER').length
  const cows               = animals.filter((a) => a.category === 'COW').length

  // ── Reproduções ───────────────────────────────────────
  const reproductions = await prisma.reproduction.findMany({
    where:  { animalId: { in: linkedAnimalIds } },
    select: { animalId: true, type: true, date: true, status: true },
  })
  const repByType: Record<string, number> = {}
  for (const r of reproductions) { repByType[r.type] = (repByType[r.type] ?? 0) + 1 }

  // ── Health Events ─────────────────────────────────────
  const healthEvents = await prisma.healthEvent.findMany({
    where:  { animalId: { in: linkedAnimalIds } },
    select: { animalId: true, type: true },
  })
  const heByType: Record<string, number> = {}
  for (const e of healthEvents) { heByType[e.type] = (heByType[e.type] ?? 0) + 1 }

  // ── Alertas ───────────────────────────────────────────
  const alerts = await prisma.alert.findMany({
    where:  { animalId: { in: linkedAnimalIds }, farmId },
    select: { animalId: true, type: true, status: true },
  })
  const alByType: Record<string, number> = {}
  for (const a of alerts) { alByType[a.type] = (alByType[a.type] ?? 0) + 1 }

  // ── AuditLog ──────────────────────────────────────────
  const auditAnimals   = await prisma.auditLog.count({ where: { entity: 'Animal',                   farmId, action: 'CREATE' } })
  const auditSnapshots = await prisma.auditLog.count({ where: { entity: 'VeterinaryAnimalSnapshot', farmId, action: 'UPDATE' } })
  const auditReport    = await prisma.auditLog.count({ where: { entity: 'VeterinaryReport',         farmId, entityId: REPORT_ID } })

  // ── Validações de integridade ─────────────────────────
  const BOV_RE = /^BOV-\d{4}$/
  const invalidTags  = animals.filter((a) => !BOV_RE.test(a.tag))
  const vetCodeAsTag = animals.filter((a) => {
    const ext = a.externalCode?.toUpperCase()
    return ext && a.tag.toUpperCase() === ext
  })

  // Snapshots apontando para animal de outra fazenda
  const crossFarmCheck = await prisma.veterinaryAnimalSnapshot.count({
    where: {
      reportId: REPORT_ID,
      animalId: { not: null },
      animal:   { farmId: { not: farmId } },
    },
  })

  // ─── OUTPUT ───────────────────────────────────────────

  console.log('┌─ 1. RELATÓRIO ────────────────────────────────────────')
  const statusOk = report.importStatus === 'IMPORTED'
  console.log(`│  Status:          ${report.importStatus}  ${statusOk ? '✅' : '⚠️'}`)
  console.log(`│  matchedRows:     ${report.matchedRows}`)
  console.log(`│  unmatchedRows:   ${report.unmatchedRows}`)
  console.log('')

  console.log('┌─ 2. ANIMAIS ───────────────────────────────────────────')
  console.log(`│  Total criados:              ${animals.length}`)
  console.log(`│  COM externalCode:           ${withExtCode}    ${withExtCode === animals.length ? '✅' : '❌'}`)
  console.log(`│  COM lastVeterinaryReportAt: ${withLastVetAt}  ${withLastVetAt === animals.length ? '✅' : '⚠️'}`)
  console.log(`│  COM parityNumber:           ${withParityNumber}`)
  console.log(`│  COM lastCalvingDate:        ${withLastCalving}`)
  console.log(`│  COM lastCcsThousand:        ${withCcs}`)
  console.log(`│  Vacas (COW):                ${cows}`)
  console.log(`│  Novilhas (HEIFER):          ${heifers}`)
  console.log('')

  console.log('┌─ 3. TAGS E CÓDIGOS ────────────────────────────────────')
  console.log(`│  Tags fora do padrão BOV-XXXX:     ${invalidTags.length}  ${invalidTags.length === 0 ? '✅' : '❌'}`)
  console.log(`│  Código vet como tag principal:    ${vetCodeAsTag.length}  ${vetCodeAsTag.length === 0 ? '✅' : '❌'}`)
  console.log(`│  Snapshots apontando outra fazenda: ${crossFarmCheck}  ${crossFarmCheck === 0 ? '✅' : '❌'}`)
  console.log('')

  console.log('┌─ 4. REPRODUÇÕES ───────────────────────────────────────')
  console.log(`│  Total:            ${reproductions.length}`)
  Object.entries(repByType).forEach(([t, n]) => console.log(`│    ${t.padEnd(20)} ${n}`))
  console.log('')

  console.log('┌─ 5. HEALTH EVENTS ────────────────────────────────────')
  console.log(`│  Total:            ${healthEvents.length}`)
  if (Object.keys(heByType).length === 0) {
    console.log('│    (nenhum — esperado para este rebanho)')
  }
  Object.entries(heByType).forEach(([t, n]) => console.log(`│    ${t.padEnd(20)} ${n}`))
  console.log('')

  console.log('┌─ 6. ALERTAS ──────────────────────────────────────────')
  console.log(`│  Total:            ${alerts.length}`)
  Object.entries(alByType).forEach(([t, n]) => console.log(`│    ${t.padEnd(25)} ${n}`))
  console.log('')

  console.log('┌─ 7. AUDIT LOG ────────────────────────────────────────')
  console.log(`│  Animals criados (CREATE):  ${auditAnimals}`)
  console.log(`│  Snapshots vinculados (UPDATE): ${auditSnapshots}`)
  console.log(`│  Relatório atualizado:      ${auditReport}`)
  console.log('')

  // ── Resultado final ────────────────────────────────────
  const ok = (
    report.importStatus === 'IMPORTED' &&
    animals.length       === 84 &&
    invalidTags.length   === 0  &&
    vetCodeAsTag.length  === 0  &&
    crossFarmCheck       === 0  &&
    withExtCode          === animals.length &&
    withLastVetAt        === animals.length
  )

  console.log('══════════════════════════════════════════════════════')
  console.log('  RESULTADO FINAL')
  console.log('══════════════════════════════════════════════════════')
  console.log(`  status:                  ${report.importStatus}`)
  console.log(`  animaisAtualizados:      ${animals.length}`)
  console.log(`  reproduçõesCriadas:      ${reproductions.length}`)
  console.log(`  healthEventsCriados:     ${healthEvents.length}`)
  console.log(`  alertasCriados:          ${alerts.length}`)
  console.log(`  auditLogEntradas:        ${auditAnimals + auditSnapshots + auditReport}`)
  console.log(`  invalidTags:             ${invalidTags.length}`)
  console.log(`  vetCodeComoTag:          ${vetCodeAsTag.length}`)
  console.log(`  crossFarmViolations:     ${crossFarmCheck}`)
  console.log('')
  if (ok) {
    console.log('  ✅ IMPORTAÇÃO COMPLETA E ÍNTEGRA')
    console.log('  ✅ Dashboard veterinário pronto com dados reais da Fazenda Saldanha')
    console.log('  ✅ Pode seguir para Sprint 9.2')
  } else {
    console.log('  ❌ Encontrado(s) problema(s) — verificar acima')
  }
  console.log('══════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
