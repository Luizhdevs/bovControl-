/**
 * DEV ONLY — ETAPA 2+3 — Preview e criação de animais da Fazenda Saldanha
 *
 * Importa os snapshots não vinculados do relatório veterinário e cria
 * os animais com tag BOV-XXXX gerada pelo BovControl.
 *
 * Uso:
 *   npx tsx scripts/dev-run-saldanha-create-animals.ts           # dry-run (preview)
 *   npx tsx scripts/dev-run-saldanha-create-animals.ts --execute  # cria animais
 */
import { prisma } from '../src/lib/prisma'
import type { Prisma } from '@prisma/client'

const REPORT_ID = process.env.REPORT_ID ?? 'cmr5g23cf0002a94s1v0br3m6'
const EXECUTE   = process.argv.includes('--execute')

// ─── Normalização de nomes ────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return stripAccents(name).toLowerCase().trim().replace(/\s+/g, ' ')
}

// ─── Main ─────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('  DEV: CRIAR ANIMAIS — Fazenda Saldanha')
  console.log(`  Modo: ${EXECUTE ? '⚡ EXECUTAR' : '🔍 DRY-RUN (preview)'}`)
  console.log(`  Relatório: ${REPORT_ID}`)
  console.log('══════════════════════════════════════════════════════════\n')

  // ── 1. Carregar relatório ─────────────────────────────
  const report = await prisma.veterinaryReport.findUnique({
    where:  { id: REPORT_ID },
    select: {
      id: true, farmId: true, importStatus: true,
      reportDate: true, matchedRows: true, unmatchedRows: true,
    },
  })
  if (!report) throw new Error(`Relatório ${REPORT_ID} não encontrado`)
  if (!['DRAFT', 'PARTIALLY_IMPORTED'].includes(report.importStatus)) {
    throw new Error(`Status inválido: ${report.importStatus}. Esperado DRAFT ou PARTIALLY_IMPORTED.`)
  }

  const { farmId } = report
  console.log(`✅ Relatório encontrado | farmId=${farmId} | status=${report.importStatus}`)

  // Buscar o userId de um MANAGER/OWNER para audit log
  const farmUser = await prisma.farmUser.findFirst({
    where:  { farmId, role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true, role: true },
  })
  const userId = farmUser?.userId ?? 'SCRIPT_DEV'
  console.log(`✅ userId para auditoria: ${userId} (${farmUser?.role ?? 'script'})`)

  // ── 2. Carregar snapshots sem vínculo ─────────────────
  const snapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where:  { reportId: REPORT_ID, farmId, animalId: null, reportGroup: { not: 'UNKNOWN' } },
    select: {
      id: true, externalCode: true, animalName: true,
      reportGroup: true, parityNumber: true,
      lastCalvingDate: true, ccsThousand: true, breed: true,
    },
  })
  console.log(`\n📋 Snapshots sem vínculo: ${snapshots.length}`)

  if (snapshots.length === 0) {
    console.log('✅ Nada a fazer — todos os snapshots já estão vinculados.')
    return
  }

  // ── 3. Agrupar por externalCode (primário) ou nome ────
  const groupMap = new Map<string, typeof snapshots>()
  let skippedNoKey = 0

  for (const snap of snapshots) {
    let key: string | null = null
    if (snap.externalCode) {
      key = `ext:${snap.externalCode.trim().toUpperCase()}`
    } else if (snap.animalName) {
      key = `name:${normalizeName(snap.animalName)}`
    }
    if (!key) { skippedNoKey++; continue }
    const group = groupMap.get(key)
    if (group) group.push(snap)
    else groupMap.set(key, [snap])
  }

  console.log(`   Grupos únicos detectados: ${groupMap.size}`)
  if (skippedNoKey > 0) console.log(`   ⚠️  ${skippedNoKey} snapshot(s) sem código nem nome — serão ignorados`)

  // ── 4. Detecção de conflitos ──────────────────────────
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

  const existingNameMap = new Map(
    existingWithName
      .filter((a): a is typeof a & { name: string } => a.name !== null)
      .map((a) => [normalizeName(a.name), a.tag]),
  )

  // ── 5. Construir lista de animais a criar ─────────────
  type AnimalPlan = {
    key:             string
    externalCode:    string | null
    animalName:      string | null
    category:        'COW' | 'HEIFER'
    breed:           string | null
    parityNumber:    number | null
    lastCalvingDate: Date | null
    ccsThousand:     number | null
    snapshotIds:     string[]
    groups:          string[]
    hasConflict:     boolean
    conflictReason?: string
  }

  const animalsToCreate: AnimalPlan[] = []

  for (const [key, snaps] of groupMap) {
    const first = snaps[0]
    if (!first) continue

    const externalCode   = first.externalCode ?? null
    const animalName     = first.animalName   ?? null
    const normName       = normalizeName(animalName)

    const category: 'COW' | 'HEIFER' = snaps.some((s) => s.reportGroup === 'PREGNANT_HEIFER')
      ? 'HEIFER'
      : 'COW'

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

    let hasConflict    = false
    let conflictReason: string | undefined

    if (externalCode && existingCodeSet.has(externalCode.trim().toUpperCase())) {
      hasConflict    = true
      conflictReason = `externalCode "${externalCode}" já existe na fazenda`
    } else if (!externalCode && normName && existingNameMap.has(normName)) {
      hasConflict    = true
      conflictReason = `nome similar ao animal ${existingNameMap.get(normName)}`
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
      snapshotIds: snaps.map((s) => s.id),
      groups:      [...new Set(snaps.map((s) => s.reportGroup))],
      hasConflict,
      conflictReason,
    })
  }

  const toCreate   = animalsToCreate.filter((a) => !a.hasConflict)
  const conflicts  = animalsToCreate.filter((a) =>  a.hasConflict)
  const totalSnaps = toCreate.reduce((s, a) => s + a.snapshotIds.length, 0)

  // ── 6. Relatório ETAPA 2 ─────────────────────────────
  console.log('\n══ ETAPA 2 — PREVIEW ══════════════════════════════════')
  console.log(`  animalsToCreate:  ${toCreate.length}`)
  console.log(`  snapshotsToLink:  ${totalSnaps}`)
  console.log(`  conflicts:        ${conflicts.length}`)
  if (conflicts.length > 0) {
    conflicts.forEach((c) =>
      console.log(`  ⚠️  CONFLITO [${c.key}] ${c.conflictReason}`),
    )
  }

  console.log('\n  Animais que serão criados (BOV-XXXX automático):')
  console.log('  Código Vet    Nome                    Categoria  Grupos')
  console.log('  ──────────────────────────────────────────────────────')
  toCreate.forEach((a) => {
    const code     = (a.externalCode ?? '—').padEnd(12)
    const name     = (a.animalName  ?? '—').padEnd(22)
    const category = a.category.padEnd(8)
    const groups   = a.groups.join(',').slice(0, 30)
    console.log(`  ${code}  ${name}  ${category}  ${groups}`)
  })

  if (!EXECUTE) {
    console.log('\n══════════════════════════════════════════════════════════')
    console.log('  ℹ️   Dry-run concluído. Nada foi salvo.')
    console.log('  Para executar: --execute')
    console.log('══════════════════════════════════════════════════════════\n')
    return
  }

  // ── 7. ETAPA 3 — Pré-gerar tags sequenciais ──────────
  console.log('\n══ ETAPA 3 — EXECUTAR ════════════════════════════════')

  const latestAnimal = await prisma.animal.findFirst({
    where:   { farmId },
    select:  { tag: true },
    orderBy: { tag: 'desc' },
  })
  const maxTagNum = latestAnimal
    ? (parseInt(latestAnimal.tag.match(/(\d+)$/)?.[1] ?? '0', 10) || 0)
    : 0

  console.log(`  Maior tag atual na fazenda: ${latestAnimal?.tag ?? 'nenhuma'} (num=${maxTagNum})`)
  console.log(`  Próxima tag: BOV-${String(maxTagNum + 1).padStart(4, '0')}`)

  const tagMap = new Map<string, string>()
  toCreate.forEach((a, i) => {
    tagMap.set(a.key, `BOV-${String(maxTagNum + i + 1).padStart(4, '0')}`)
  })

  // ── 8. Transação atômica ──────────────────────────────
  const reportDate = new Date(report.reportDate)

  type CreatedInfo = {
    id: string; tag: string; externalCode: string | null
    snapshotIds: string[]; groups: string[]
  }

  console.log(`  Iniciando $transaction...`)

  const createdAnimals = await prisma.$transaction(async (tx) => {
    // Re-verificar status dentro da tx (idempotência)
    const freshReport = await tx.veterinaryReport.findFirst({
      where:  { id: REPORT_ID, farmId },
      select: { importStatus: true },
    })
    if (!freshReport) throw new Error('Relatório não encontrado na transação')
    if (freshReport.importStatus === 'IMPORTED') {
      throw new Error('Relatório já confirmado — operação abortada')
    }

    const results: CreatedInfo[] = []

    for (const ap of toCreate) {
      const tag = tagMap.get(ap.key)
      if (!tag) continue

      const animal = await tx.animal.create({
        data: {
          farmId,
          tag,
          name:                   ap.animalName   ?? undefined,
          externalCode:           ap.externalCode ?? undefined,
          sex:                    'FEMALE',
          category:               ap.category,
          breed:                  ap.breed ?? 'Mestiço',
          status:                 'ACTIVE',
          parityNumber:           ap.parityNumber    ?? undefined,
          lastCalvingDate:        ap.lastCalvingDate ?? undefined,
          lastVeterinaryReportAt: reportDate,
          lastCcsThousand:        ap.ccsThousand     ?? undefined,
        },
        select: { id: true, tag: true, externalCode: true },
      })

      // Vincular snapshots
      await tx.veterinaryAnimalSnapshot.updateMany({
        where: { id: { in: ap.snapshotIds }, farmId, reportId: REPORT_ID, animalId: null },
        data:  { animalId: animal.id },
      })

      results.push({
        id:           animal.id,
        tag:          animal.tag,
        externalCode: animal.externalCode ?? null,
        snapshotIds:  ap.snapshotIds,
        groups:       ap.groups,
      })
    }

    // Atualizar contadores do relatório
    const linkedNow    = results.reduce((s, a) => s + a.snapshotIds.length, 0)
    const newMatched   = (report.matchedRows   ?? 0) + linkedNow
    const newUnmatched = Math.max(0, (report.unmatchedRows ?? 0) - linkedNow)

    await tx.veterinaryReport.update({
      where: { id: REPORT_ID },
      data:  { matchedRows: newMatched, unmatchedRows: newUnmatched },
    })

    return results
  })

  console.log(`  ✅ Transação concluída: ${createdAnimals.length} animais criados`)

  // ── 9. AuditLog (direto, sem server-only) ────────────
  const auditEntries: Prisma.AuditLogCreateManyInput[] = []

  for (const ca of createdAnimals) {
    auditEntries.push({
      farmId,
      userId,
      action:   'CREATE',
      entity:   'Animal',
      entityId: ca.id,
      metadata: ({
        event:         'VETERINARY_IMPORT_ANIMAL_CREATED',
        source:        'dev_script',
        reportId:      REPORT_ID,
        generatedTag:  ca.tag,
        externalCode:  ca.externalCode,
        snapshotCount: ca.snapshotIds.length,
        groups:        ca.groups,
      }) as unknown as Prisma.InputJsonValue,
    })
    for (const snapId of ca.snapshotIds) {
      auditEntries.push({
        farmId,
        userId,
        action:   'UPDATE',
        entity:   'VeterinaryAnimalSnapshot',
        entityId: snapId,
        metadata: ({
          event:        'VETERINARY_SNAPSHOT_AUTO_LINKED_AFTER_ANIMAL_CREATION',
          source:       'dev_script',
          reportId:     REPORT_ID,
          animalId:     ca.id,
          generatedTag: ca.tag,
          externalCode: ca.externalCode,
        }) as unknown as Prisma.InputJsonValue,
      })
    }
  }

  if (auditEntries.length > 0) {
    await prisma.auditLog.createMany({ data: auditEntries })
    console.log(`  ✅ AuditLog: ${auditEntries.length} entradas registradas`)
  }

  // ── 10. Resultado final ───────────────────────────────
  const totalLinked = createdAnimals.reduce((s, a) => s + a.snapshotIds.length, 0)

  console.log('\n══ RESULTADO ══════════════════════════════════════════')
  console.log(`  Animais criados:       ${createdAnimals.length}`)
  console.log(`  Snapshots vinculados:  ${totalLinked}`)
  console.log(`  Conflitos ignorados:   ${conflicts.length}`)
  console.log('\n  Tags geradas:')
  createdAnimals.forEach((a) => {
    const bov = `BOV-${a.tag.split('BOV-')[1] ?? a.tag}`
    console.log(`    ${bov}  →  ext:${a.externalCode ?? '(sem código)'}`)
  })

  // Validação pós-criação: garantir que nenhuma tag tem código vet
  const vetCodeSet = new Set(
    createdAnimals
      .filter((a) => a.externalCode !== null)
      .map((a) => (a.externalCode as string).toUpperCase()),
  )
  const tagViolations = createdAnimals.filter((a) => vetCodeSet.has(a.tag.toUpperCase()))
  if (tagViolations.length > 0) {
    console.error(`\n  ❌ VIOLAÇÃO: ${tagViolations.length} animal(is) com código vet como tag!`)
    tagViolations.forEach((a) =>
      console.error(`     tag="${a.tag}" externalCode="${a.externalCode}"`),
    )
    process.exit(2)
  }

  const invalidTagPattern = createdAnimals.filter((a) => !/^BOV-\d{4}$/.test(a.tag))
  if (invalidTagPattern.length > 0) {
    console.error(`\n  ❌ VIOLAÇÃO: ${invalidTagPattern.length} tag(s) fora do padrão BOV-XXXX!`)
    invalidTagPattern.forEach((a) => console.error(`     tag="${a.tag}"`))
    process.exit(2)
  }

  console.log('\n  ✅ Validação pós-criação: OK')
  console.log('    - Nenhuma tag é código veterinário')
  console.log('    - Todas as tags seguem BOV-XXXX')
  console.log('    - externalCode recebeu os códigos veterinários')
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('  Próximo passo: rodar dev-run-saldanha-confirm-import.ts')
  console.log('══════════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('\n❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
