/**
 * Sprint 9.3 — Etapa 1: Auditoria Segura do Rebanho
 *
 * SOMENTE LEITURA — nenhuma alteração será feita.
 *
 * Separa os animais em grupos por origem e audita:
 * 1. Importados do relatório veterinário
 * 2. Cadastrados manualmente
 * 3. Suspeitos de seed/demo
 * 4. Animais com fotos
 * 5. Animais com dados operacionais
 * 6. Status, categoria, reprodução
 *
 * Uso: DATABASE_URL="..." npx tsx scripts/sprint93-audit-rebanho.ts
 */
import { prisma } from '../src/lib/prisma'

const FARM_ID   = 'farm_saldanha'
const REPORT_ID = 'cmr5kk23g0002oxkorc1wdcjd'

function hr(char = '─', len = 72) { return char.repeat(len) }
function pad(s: string, n: number) { return s.padEnd(n) }

async function main() {
  console.log('\n' + hr('═'))
  console.log('  SPRINT 9.3 — AUDITORIA SEGURA DO REBANHO')
  console.log(`  Fazenda: ${FARM_ID}`)
  console.log(`  Relatório vet: ${REPORT_ID}`)
  console.log('  Modo: SOMENTE LEITURA — nenhuma alteração será feita')
  console.log(hr('═') + '\n')

  // ─── Carregar todos os animais ────────────────────────────
  const allAnimals = await prisma.animal.findMany({
    where: { farmId: FARM_ID },
    select: {
      id: true, tag: true, name: true, sex: true, category: true,
      status: true, breed: true, birthDate: true, birthType: true,
      entryDate: true, createdAt: true, lotId: true, milkStatus: true,
      externalCode: true, parityNumber: true, lastCalvingDate: true,
      observations: true,
      lot: { select: { name: true, type: true } },
      _count: {
        select: {
          photos: true, weightRecords: true, healthEvents: true,
          milkRecords: true, reproductions: true,
        },
      },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
  })

  // ─── Snapshots do relatório veterinário ──────────────────
  const snapshots = await prisma.veterinaryAnimalSnapshot.findMany({
    where: { farmId: FARM_ID, reportId: REPORT_ID },
    select: {
      animalId: true, animalName: true, externalCode: true,
      reportGroup: true, parityNumber: true, lastCalvingDate: true,
      inseminationDate: true, expectedCalvingDate: true,
      ccsThousand: true, milkCurrent: true,
      occurrence: true, discardRecommendation: true,
    },
  })

  const snapshotByAnimalId = new Map(
    snapshots.filter(s => s.animalId).map(s => [s.animalId!, s])
  )
  const snapshotedIds  = new Set(snapshots.filter(s => s.animalId).map(s => s.animalId!))
  const unmatchedSnaps = snapshots.filter(s => !s.animalId)

  // ─── Reproduções de todos os animais ─────────────────────
  const reproductions = await prisma.reproduction.findMany({
    where:   { animal: { farmId: FARM_ID } },
    select:  { animalId: true, type: true, date: true, status: true },
    orderBy: { date: 'asc' },
  })

  const repByAnimal = new Map<string, typeof reproductions>()
  for (const r of reproductions) {
    if (!repByAnimal.has(r.animalId)) repByAnimal.set(r.animalId, [])
    repByAnimal.get(r.animalId)!.push(r)
  }

  // ─── Classifica animais por origem ───────────────────────
  type Origin = 'VET_REPORT' | 'MANUAL' | 'SUSPECT_SEED'

  function classify(a: typeof allAnimals[0]): Origin {
    if (snapshotedIds.has(a.id)) return 'VET_REPORT'
    const hasHistory =
      a._count.weightRecords > 0 || a._count.healthEvents > 0 ||
      a._count.milkRecords > 0   || a._count.reproductions > 0 ||
      a._count.photos > 0
    const tagNum = parseInt(a.tag.replace('BOV-', '')) || 9999
    // Seed: tag muito baixa + sem nome + sem histórico (padrão típico de seed)
    if (tagNum <= 20 && !a.name && !hasHistory) return 'SUSPECT_SEED'
    return 'MANUAL'
  }

  const groups: Record<Origin, typeof allAnimals> = {
    VET_REPORT:   [],
    MANUAL:       [],
    SUSPECT_SEED: [],
  }
  for (const a of allAnimals) groups[classify(a)].push(a)

  // ─── Cortes úteis ─────────────────────────────────────────
  const activeAnimals  = allAnimals.filter(a => a.status === 'ACTIVE')
  const inactiveAnimals = allAnimals.filter(a => a.status !== 'ACTIVE')

  const byStatus: Record<string, number> = {}
  for (const a of allAnimals) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1

  const byCategory: Record<string, number> = {}
  for (const a of activeAnimals) byCategory[a.category] = (byCategory[a.category] ?? 0) + 1

  const withPhotos    = activeAnimals.filter(a => a._count.photos > 0)
  const withoutPhotos = activeAnimals.filter(a => a._count.photos === 0)

  const withHistory   = activeAnimals.filter(a =>
    a._count.weightRecords > 0 || a._count.healthEvents > 0 ||
    a._count.milkRecords > 0   || a._count.reproductions > 0
  )

  // ─── Partos de 2026 ──────────────────────────────────────
  const calvingsByAnimal = new Map<string, Date[]>()
  for (const r of reproductions) {
    if (r.type === 'CALVING') {
      if (!calvingsByAnimal.has(r.animalId)) calvingsByAnimal.set(r.animalId, [])
      calvingsByAnimal.get(r.animalId)!.push(r.date)
    }
  }
  const calvings2026 = reproductions.filter(r =>
    r.type === 'CALVING' && r.date >= new Date('2026-01-01')
  )

  // ─── Prenhes confirmadas ──────────────────────────────────
  const confirmedPregnant = activeAnimals.filter(a => {
    const reps = repByAnimal.get(a.id) ?? []
    const lastCheck = reps
      .filter(r => r.type === 'PREGNANCY_CHECK' && r.status === 'CONFIRMED')
      .sort((x, y) => y.date.getTime() - x.date.getTime())[0]
    if (!lastCheck) return false
    const lastInsem = reps
      .filter(r => r.type === 'INSEMINATION' || r.type === 'NATURAL_MATING')
      .sort((x, y) => y.date.getTime() - x.date.getTime())[0]
    const cutoff = lastInsem?.date ?? new Date(lastCheck.date.getTime() - 365 * 864e5)
    const hasParto = (calvingsByAnimal.get(a.id) ?? []).some(d => d >= cutoff)
    return !hasParto
  })

  // ═══════════════════════════════════════════════════════
  // RELATÓRIO
  // ═══════════════════════════════════════════════════════

  console.log('## 1. RESUMO GERAL\n')
  console.log(`Total de animais (todos os status): ${allAnimals.length}`)
  for (const [st, n] of Object.entries(byStatus)) {
    console.log(`  ${pad(st, 14)} ${n}`)
  }
  console.log()
  console.log('Por categoria (somente ACTIVE):')
  for (const [cat, n] of Object.entries(byCategory)) {
    console.log(`  ${pad(cat, 10)} ${n}`)
  }

  // ─── Grupos por origem ────────────────────────────────────
  console.log('\n' + hr())
  console.log('## 2. GRUPOS POR ORIGEM\n')
  console.log(`  Importados do relatório veterinário: ${groups.VET_REPORT.length}`)
  console.log(`  Cadastrados manualmente:             ${groups.MANUAL.length}`)
  console.log(`  Suspeitos de seed/demo:              ${groups.SUSPECT_SEED.length}`)
  console.log(`  Snapshots sem match no cadastro:     ${unmatchedSnaps.length}`)

  // ─── Detalhe: do relatório ────────────────────────────────
  console.log('\n' + hr())
  console.log(`## 3. ANIMAIS DO RELATÓRIO VETERINÁRIO (${groups.VET_REPORT.length})\n`)
  console.log(pad('TAG', 10) + pad('NOME', 22) + pad('CAT', 8) + pad('STATUS', 12) + pad('GRUPO_REL', 28) + 'FOTOS')
  console.log(hr('-'))
  for (const a of groups.VET_REPORT) {
    const snap = snapshotByAnimalId.get(a.id)
    console.log(
      pad(a.tag, 10) +
      pad(a.name ?? '—', 22) +
      pad(a.category, 8) +
      pad(a.status, 12) +
      pad(snap?.reportGroup ?? '?', 28) +
      a._count.photos
    )
  }

  // ─── Detalhe: manuais ─────────────────────────────────────
  console.log('\n' + hr())
  console.log(`## 4. ANIMAIS CADASTRADOS MANUALMENTE (${groups.MANUAL.length})\n`)
  console.log(pad('TAG', 10) + pad('NOME', 22) + pad('CAT', 8) + pad('STATUS', 12) + pad('LOT', 18) + pad('REP', 5) + 'FOTOS')
  console.log(hr('-'))
  for (const a of groups.MANUAL) {
    console.log(
      pad(a.tag, 10) +
      pad(a.name ?? '—', 22) +
      pad(a.category, 8) +
      pad(a.status, 12) +
      pad(a.lot?.name ?? '—', 18) +
      pad(String(a._count.reproductions), 5) +
      a._count.photos
    )
  }

  // ─── Detalhe: suspeitos de seed ───────────────────────────
  if (groups.SUSPECT_SEED.length > 0) {
    console.log('\n' + hr())
    console.log(`## 5. SUSPEITOS DE SEED/DEMO (${groups.SUSPECT_SEED.length})\n`)
    console.log('  !! NÃO deletar automaticamente — confirmar com o usuário antes !!\n')
    console.log(pad('TAG', 10) + pad('NOME', 22) + pad('CAT', 8) + pad('SEX', 8) + 'CRIADO_EM')
    console.log(hr('-'))
    for (const a of groups.SUSPECT_SEED) {
      console.log(
        pad(a.tag, 10) +
        pad(a.name ?? '(sem nome)', 22) +
        pad(a.category, 8) +
        pad(a.sex, 8) +
        a.createdAt.toISOString().slice(0, 10)
      )
    }
  }

  // ─── Snapshots sem match ──────────────────────────────────
  if (unmatchedSnaps.length > 0) {
    console.log('\n' + hr())
    console.log(`## 6. LINHAS DO RELATÓRIO SEM MATCH NO CADASTRO (${unmatchedSnaps.length})\n`)
    console.log('  Animais no relatório veterinário que não foram encontrados no cadastro.\n')
    console.log(pad('NOME_REL', 26) + pad('COD_EXT', 16) + 'GRUPO')
    console.log(hr('-'))
    for (const s of unmatchedSnaps) {
      console.log(
        pad(s.animalName ?? '—', 26) +
        pad(s.externalCode ?? '—', 16) +
        s.reportGroup
      )
    }
  }

  // ─── Fotos ────────────────────────────────────────────────
  console.log('\n' + hr())
  console.log('## 7. FOTOS (animais ACTIVE)\n')
  console.log(`  Com foto:    ${withPhotos.length}`)
  console.log(`  Sem foto:    ${withoutPhotos.length}\n`)
  console.log('  Animais ACTIVE sem foto:')
  for (const a of withoutPhotos) {
    console.log(`    ${pad(a.tag, 10)} ${pad(a.name ?? '—', 20)} ${a.category}`)
  }

  // ─── Histórico ────────────────────────────────────────────
  console.log('\n' + hr())
  console.log('## 8. DADOS OPERACIONAIS (animais ACTIVE)\n')
  console.log(`  Com algum dado operacional:    ${withHistory.length}`)
  console.log(`  Sem nenhum dado operacional:   ${activeAnimals.length - withHistory.length}\n`)

  const noHistory = activeAnimals.filter(a =>
    a._count.weightRecords === 0 && a._count.healthEvents === 0 &&
    a._count.milkRecords === 0   && a._count.reproductions === 0
  )
  if (noHistory.length > 0) {
    console.log('  Sem histórico (possíveis seeds ou recém-cadastrados):')
    for (const a of noHistory) {
      console.log(`    ${pad(a.tag, 10)} ${pad(a.name ?? '—', 20)} ${a.category} criado:${a.createdAt.toISOString().slice(0,10)}`)
    }
  }

  // ─── Reprodução ───────────────────────────────────────────
  console.log('\n' + hr())
  console.log('## 9. DIAGNÓSTICO REPRODUTIVO\n')
  console.log(`  Confirmadas prenhes (query corrigida):  ${confirmedPregnant.length}`)
  console.log(`  Com pelo menos 1 CALVING:               ${[...calvingsByAnimal.keys()].length}`)
  console.log(`  Partos de 2026 registrados:             ${calvings2026.length}`)

  if (confirmedPregnant.length > 0) {
    console.log('\n  Prenhes confirmadas:')
    console.log('  ' + pad('TAG', 10) + pad('NOME', 22) + pad('CAT', 8) + 'LOT')
    for (const a of confirmedPregnant) {
      console.log('  ' + pad(a.tag, 10) + pad(a.name ?? '—', 22) + pad(a.category, 8) + (a.lot?.name ?? '—'))
    }
  }

  // ─── Descarte ─────────────────────────────────────────────
  const withDiscard = snapshots.filter(s => s.discardRecommendation)
  if (withDiscard.length > 0) {
    console.log('\n' + hr())
    console.log(`## 10. RECOMENDAÇÕES DE DESCARTE (relatório veterinário) — ${withDiscard.length}\n`)
    console.log(pad('NOME_REL', 24) + 'RECOMENDAÇÃO')
    console.log(hr('-'))
    for (const s of withDiscard) {
      console.log(pad(s.animalName ?? '—', 24) + (s.discardRecommendation ?? ''))
    }
  }

  // ─── Animais inativos ─────────────────────────────────────
  if (inactiveAnimals.length > 0) {
    console.log('\n' + hr())
    console.log(`## 11. ANIMAIS INATIVOS (${inactiveAnimals.length})\n`)
    console.log(pad('TAG', 10) + pad('NOME', 22) + pad('CAT', 8) + 'STATUS')
    console.log(hr('-'))
    for (const a of inactiveAnimals) {
      console.log(pad(a.tag, 10) + pad(a.name ?? '—', 22) + pad(a.category, 8) + a.status)
    }
  }

  // ─── Sumário executivo ────────────────────────────────────
  console.log('\n' + hr('═'))
  console.log('  SUMÁRIO EXECUTIVO — SPRINT 9.3 ETAPA 1\n')
  console.log(`  Total de animais:               ${allAnimals.length}`)
  console.log(`  Animais ACTIVE:                 ${activeAnimals.length}`)
  console.log(`  → Do relatório veterinário:     ${groups.VET_REPORT.filter(a => a.status === 'ACTIVE').length}`)
  console.log(`  → Cadastrados manualmente:      ${groups.MANUAL.filter(a => a.status === 'ACTIVE').length}`)
  console.log(`  → Suspeitos de seed (ACTIVE):   ${groups.SUSPECT_SEED.filter(a => a.status === 'ACTIVE').length}`)
  console.log(`  Animais inativos:               ${inactiveAnimals.length}`)
  console.log(`  Sem foto (ACTIVE):              ${withoutPhotos.length}`)
  console.log(`  Sem histórico (ACTIVE):         ${noHistory.length}`)
  console.log(`  Prenhes confirmadas:            ${confirmedPregnant.length}`)
  console.log(`  Partos 2026 registrados:        ${calvings2026.length}`)
  console.log(`  Snapshots vet sem match:        ${unmatchedSnaps.length}`)
  console.log(`  Com descarte recomendado:       ${withDiscard.length}`)
  console.log('\n  NENHUMA ALTERAÇÃO FOI FEITA.')
  console.log(hr('═') + '\n')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
