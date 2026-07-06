/**
 * scripts/audit-before-confirm.ts
 * Auditoria pré-confirmação do relatório cmr5g23cf0002a94s1v0br3m6
 */
import { PrismaClient } from '@prisma/client'

const prisma   = new PrismaClient()
const REPORT_ID = 'cmr5g23cf0002a94s1v0br3m6'

async function main() {
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  AUDITORIA PRÉ-CONFIRMAÇÃO — Fazenda Saldanha')
  console.log(`  Relatório: ${REPORT_ID}`)
  console.log('══════════════════════════════════════════════════════\n')

  // ── 1. Relatório ─────────────────────────────────────────
  const report = await prisma.veterinaryReport.findUnique({
    where:  { id: REPORT_ID },
    select: {
      id: true, farmId: true, importStatus: true,
      reportDate: true, sourceSystem: true,
      totalRows: true, matchedRows: true, unmatchedRows: true,
      technicianName: true, externalFarmName: true, externalOwnerName: true,
    },
  })

  if (!report) {
    console.error('❌  Relatório não encontrado.')
    return
  }

  // ── 2. Fazenda ────────────────────────────────────────────
  const farm = await prisma.farm.findUnique({
    where:  { id: report.farmId },
    select: { id: true, name: true },
  })

  // ── 3. Snapshots ─────────────────────────────────────────
  const snapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where:  { reportId: REPORT_ID, farmId: report.farmId },
    select: { id: true, animalId: true, externalCode: true, animalName: true, reportGroup: true },
  })

  const snapshotsTotal    = snapshots.length
  const snapshotsLinked   = snapshots.filter((s) => s.animalId !== null).length
  const snapshotsUnlinked = snapshots.filter((s) => s.animalId === null).length

  // ── 4. Animais criados a partir do relatório ──────────────
  // Animais cujos IDs aparecem nos snapshots vinculados
  const linkedAnimalIds = [
    ...new Set(
      snapshots
        .filter((s) => s.animalId !== null)
        .map((s) => s.animalId as string),
    ),
  ]

  const animals = linkedAnimalIds.length > 0
    ? await prisma.animal.findMany({
        where:  { id: { in: linkedAnimalIds }, farmId: report.farmId },
        select: {
          id: true, tag: true, externalCode: true, name: true,
          category: true, status: true, breed: true,
          lastVeterinaryReportAt: true,
        },
        orderBy: { tag: 'asc' },
      })
    : []

  const animalsCreated = animals.length

  // ── 5. Validação de tags BOV-XXXX ────────────────────────
  const BOV_TAG_RE  = /^BOV-\d{4}$/
  const invalidTags = animals.filter((a) => !BOV_TAG_RE.test(a.tag))

  // ── 6. Verificar que código vet está em externalCode, não em tag ──
  const vetCodesFromSnapshots = new Set(
    snapshots
      .filter((s) => s.externalCode)
      .map((s) => (s.externalCode as string).toUpperCase()),
  )

  // Animal cujo TAG coincide com um código veterinário (NUNCA deveria acontecer)
  const tagIsVetCode = animals.filter(
    (a) => vetCodesFromSnapshots.has(a.tag.toUpperCase()),
  )

  // ── 7. Códigos externos nos animais ──────────────────────
  const animalsWithExtCode    = animals.filter((a) => a.externalCode !== null)
  const animalsWithoutExtCode = animals.filter((a) => a.externalCode === null)

  // ── 8. Duplicatas de externalCode na mesma fazenda ───────
  const extCodeCounts = new Map<string, string[]>()
  const allAnimalsWithCode = await prisma.animal.findMany({
    where:  { farmId: report.farmId, externalCode: { not: null } },
    select: { tag: true, externalCode: true },
  })
  for (const a of allAnimalsWithCode) {
    const key  = (a.externalCode as string).toUpperCase()
    const prev = extCodeCounts.get(key) ?? []
    prev.push(a.tag)
    extCodeCounts.set(key, prev)
  }
  const duplicatedExternalCodes = [...extCodeCounts.entries()]
    .filter(([, tags]) => tags.length > 1)
    .map(([code, tags]) => ({ code, tags }))

  // ── 9. Nomes duplicados nos animais criados ───────────────
  const nameCounts = new Map<string, string[]>()
  for (const a of animals) {
    if (!a.name) continue
    const key  = a.name.trim().toLowerCase()
    const prev = nameCounts.get(key) ?? []
    prev.push(a.tag)
    nameCounts.set(key, prev)
  }
  const duplicatedNames = [...nameCounts.entries()]
    .filter(([, tags]) => tags.length > 1)
    .map(([name, tags]) => ({ name, tags }))

  // ── 10. Reproduction / HealthEvent / Alert já existem? ───
  let reproductionCount = 0
  let healthEventCount  = 0
  let alertCount        = 0

  // Verificar se os modelos existem no schema (use try/catch para robustez)
  try {
    reproductionCount = await (prisma as any).reproduction.count({
      where: { farmId: report.farmId, animalId: { in: linkedAnimalIds } },
    })
  } catch {
    reproductionCount = -1 // modelo não existe ou sem acesso
  }
  try {
    healthEventCount = await (prisma as any).healthEvent.count({
      where: { farmId: report.farmId, animalId: { in: linkedAnimalIds } },
    })
  } catch {
    healthEventCount = -1
  }
  try {
    alertCount = await (prisma as any).alert.count({
      where: { farmId: report.farmId, animalId: { in: linkedAnimalIds } },
    })
  } catch {
    alertCount = -1
  }

  // ── 11. Status do relatório ───────────────────────────────
  const allowedStatuses = ['DRAFT', 'PARTIALLY_IMPORTED']
  const statusOk        = allowedStatuses.includes(report.importStatus)

  // ── Determinar readyToConfirm ─────────────────────────────
  const problems: string[] = []
  if (!statusOk)                problems.push(`Status inválido: ${report.importStatus}`)
  if (snapshotsLinked === 0)    problems.push('Nenhum snapshot vinculado — confirmação não teria efeito')
  if (invalidTags.length > 0)   problems.push(`${invalidTags.length} animal(is) com tag fora do padrão BOV-XXXX`)
  if (tagIsVetCode.length > 0)  problems.push(`${tagIsVetCode.length} animal(is) com código veterinário como tag principal`)
  if (duplicatedExternalCodes.length > 0) problems.push(`${duplicatedExternalCodes.length} externalCode duplicado(s) na fazenda`)
  const readyToConfirm = problems.length === 0

  // ═══ OUTPUT ══════════════════════════════════════════════

  console.log('┌─ 1. FAZENDA ──────────────────────────────────────────')
  console.log(`│  ID:    ${farm?.id ?? '?'}`)
  console.log(`│  Nome:  ${farm?.name ?? '?'}`)
  console.log(`│  Técnico: ${report.technicianName ?? '—'}`)
  console.log(`│  Fazenda ext.: ${report.externalFarmName ?? '—'}`)
  console.log(`│  Proprietário: ${report.externalOwnerName ?? '—'}`)
  console.log('')

  console.log('┌─ 2. RELATÓRIO ────────────────────────────────────────')
  console.log(`│  Status:        ${report.importStatus}  ${statusOk ? '✅' : '❌'}`)
  console.log(`│  Data:          ${report.reportDate.toISOString().slice(0, 10)}`)
  console.log(`│  Total rows:    ${report.totalRows}`)
  console.log(`│  matchedRows:   ${report.matchedRows}`)
  console.log(`│  unmatchedRows: ${report.unmatchedRows}`)
  console.log('')

  console.log('┌─ 3. SNAPSHOTS ────────────────────────────────────────')
  console.log(`│  Total:        ${snapshotsTotal}`)
  console.log(`│  Vinculados:   ${snapshotsLinked}  ${snapshotsLinked > 0 ? '✅' : '⚠️'}`)
  console.log(`│  Sem vínculo:  ${snapshotsUnlinked}  ${snapshotsUnlinked === 0 ? '✅' : '⚠️  (serão ignorados na confirmação)'}`)
  console.log('')

  if (snapshotsUnlinked > 0) {
    console.log('│  Snapshots sem vínculo:')
    snapshots
      .filter((s) => s.animalId === null)
      .forEach((s) => {
        console.log(`│    [${s.reportGroup.padEnd(22)}]  ${(s.externalCode ?? '—').padEnd(12)}  ${s.animalName ?? '—'}`)
      })
    console.log('')
  }

  console.log('┌─ 4. ANIMAIS CRIADOS ──────────────────────────────────')
  console.log(`│  Total animais vinculados ao relatório: ${animalsCreated}`)
  console.log(`│  Com externalCode:    ${animalsWithExtCode.length}`)
  console.log(`│  Sem externalCode:    ${animalsWithoutExtCode.length}`)
  console.log('')

  console.log('│  Lista de animais (TAG → externalCode → Nome):')
  animals.forEach((a) => {
    const tagOk  = BOV_TAG_RE.test(a.tag) ? '✅' : '❌'
    const extOk  = a.externalCode ? `ext:${a.externalCode}` : '— sem código'
    console.log(`│    ${tagOk} ${a.tag.padEnd(10)}  ${extOk.padEnd(20)}  ${a.name ?? '(sem nome)'}`)
  })
  console.log('')

  console.log('┌─ 5. VALIDAÇÃO DE TAGS ────────────────────────────────')
  console.log(`│  Tags fora do padrão BOV-XXXX: ${invalidTags.length}  ${invalidTags.length === 0 ? '✅' : '❌'}`)
  if (invalidTags.length > 0) {
    invalidTags.forEach((a) => console.log(`│    ❌ tag="${a.tag}"  ext="${a.externalCode ?? '—'}"  nome="${a.name ?? '—'}"`))
  }
  console.log('')

  console.log('┌─ 6. CÓDIGO VET NA TAG PRINCIPAL ──────────────────────')
  console.log(`│  Animais com código vet como tag: ${tagIsVetCode.length}  ${tagIsVetCode.length === 0 ? '✅' : '❌'}`)
  if (tagIsVetCode.length > 0) {
    tagIsVetCode.forEach((a) => console.log(`│    ❌ tag="${a.tag}"  externalCode="${a.externalCode ?? '—'}"`))
  }
  console.log('')

  console.log('┌─ 7. DUPLICATAS DE EXTERNAL CODE ──────────────────────')
  console.log(`│  externalCodes duplicados na fazenda: ${duplicatedExternalCodes.length}  ${duplicatedExternalCodes.length === 0 ? '✅' : '❌'}`)
  if (duplicatedExternalCodes.length > 0) {
    duplicatedExternalCodes.forEach(({ code, tags }) =>
      console.log(`│    ❌ "${code}" aparece em: ${tags.join(', ')}`),
    )
  }
  console.log('')

  console.log('┌─ 8. NOMES DUPLICADOS ─────────────────────────────────')
  console.log(`│  Nomes duplicados nos animais criados: ${duplicatedNames.length}  ${duplicatedNames.length === 0 ? '✅' : '⚠️'}`)
  if (duplicatedNames.length > 0) {
    duplicatedNames.forEach(({ name, tags }) =>
      console.log(`│    ⚠️  "${name}" em: ${tags.join(', ')}`),
    )
  }
  console.log('')

  console.log('┌─ 9. REPRODUCTION / HEALTHEVENT / ALERT ───────────────')
  const fmtCount = (n: number, label: string) => {
    if (n === -1) return `│  ${label}: modelo não encontrado no schema`
    return `│  ${label}: ${n}  ${n === 0 ? '✅' : '⚠️  JÁ EXISTEM — verificar se são pré-existentes'}`
  }
  console.log(fmtCount(reproductionCount, 'Reproductions'))
  console.log(fmtCount(healthEventCount,  'HealthEvents'))
  console.log(fmtCount(alertCount,        'Alerts'))
  console.log('')

  // ─── SUMÁRIO ──────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════')
  console.log('  SUMÁRIO EXECUTIVO')
  console.log('══════════════════════════════════════════════════════')
  console.log(`  snapshotsTotal:            ${snapshotsTotal}`)
  console.log(`  snapshotsLinked:           ${snapshotsLinked}`)
  console.log(`  snapshotsUnlinked:         ${snapshotsUnlinked}`)
  console.log(`  animalsCreated:            ${animalsCreated}`)
  console.log(`  duplicatedExternalCodes:   ${duplicatedExternalCodes.length}`)
  console.log(`  duplicatedNames:           ${duplicatedNames.length}`)
  console.log(`  invalidTags:               ${invalidTags.length}`)
  console.log(`  tagIsVetCode:              ${tagIsVetCode.length}`)
  console.log(`  status:                    ${report.importStatus}`)
  console.log(`  readyToConfirm:            ${readyToConfirm ? 'true ✅' : 'false ❌'}`)
  console.log('')

  if (readyToConfirm) {
    console.log('  ✅  PODE CLICAR EM "Confirmar e aplicar".')
    console.log('      Todos os pré-requisitos estão satisfeitos.')
    if (snapshotsUnlinked > 0) {
      console.log(`\n  ℹ️   Nota: ${snapshotsUnlinked} snapshot(s) sem vínculo serão`)
      console.log('       preservados como histórico mas não alterarão dados.')
    }
  } else {
    console.log('  ❌  NÃO CONFIRMAR AINDA. Problemas encontrados:')
    problems.forEach((p, i) => console.log(`     ${i + 1}. ${p}`))
  }
  console.log('══════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
