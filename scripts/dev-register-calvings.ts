/**
 * Registra eventos CALVING no módulo de reprodução para todas as vacas
 * que pariram conforme o caderno PRO-SUI (maio–julho 2026).
 *
 * Efeito: remove essas vacas da lista "prenhes" na página de Reprodução.
 *
 * Preview:  npx tsx scripts/dev-register-calvings.ts
 * Executar: DATABASE_URL="..." npx tsx scripts/dev-register-calvings.ts --execute
 */
import { prisma } from '../src/lib/prisma'

const FARM_ID = 'farm_saldanha'
const EXECUTE = process.argv.includes('--execute')

// Partos confirmados do caderno
const PARTOS: { tag: string; name: string; date: string }[] = [
  { tag: 'BOV-0076', name: 'Piaba',      date: '2026-05-19' },
  { tag: 'BOV-0062', name: 'Criolinha',  date: '2026-05-21' },
  { tag: 'BOV-0058', name: 'Canela',     date: '2026-06-01' },
  { tag: 'BOV-0083', name: 'Uberaba',    date: '2026-06-02' },
  { tag: 'BOV-0074', name: 'Manhosa',    date: '2026-06-03' },
  { tag: 'BOV-0071', name: 'Lojinha',    date: '2026-06-05' },
  { tag: 'BOV-0087', name: 'Brasilia',   date: '2026-06-07' },
  { tag: 'BOV-0088', name: 'Cassarola',  date: '2026-06-09' },
  { tag: 'BOV-0089', name: 'Perdiz',     date: '2026-06-09' },
  { tag: 'BOV-0090', name: 'Boneca',     date: '2026-06-13' },
  { tag: 'BOV-0070', name: 'Ituitaba',   date: '2026-06-15' },
  { tag: 'BOV-0059', name: 'Cerveja',    date: '2026-06-15' },
  { tag: 'BOV-0091', name: 'Rainha',     date: '2026-06-15' },
  { tag: 'BOV-0065', name: 'Espoleta',   date: '2026-06-22' },
  { tag: 'BOV-0032', name: 'Garça',      date: '2026-06-23' },
  { tag: 'BOV-0057', name: 'Cabana',     date: '2026-06-27' },
  { tag: 'BOV-0092', name: 'Castanha',   date: '2026-06-27' },
  { tag: 'BOV-0079', name: 'Roxinha',    date: '2026-07-02' },
  { tag: 'BOV-0029', name: 'Esmeralda',  date: '2026-07-03' },
]

// Vacas sem tag fixa (registradas apenas pelo nome — precisamos buscar por nome)
const PARTOS_BY_NAME: { name: string; date: string }[] = [
  { name: 'Piabinha', date: '2026-05-23' },
  { name: 'Azeitona', date: '2026-05-28' },
  { name: 'Luxosa',   date: '2026-06-15' },
  { name: 'Gaucha',   date: '2026-06-29' },
  { name: 'Chitinha', date: '2026-07-03' },
]

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log('  REGISTRAR EVENTOS DE PARTO (CALVING)')
  console.log(`  Modo: ${EXECUTE ? '🚀 EXECUÇÃO REAL' : '🔍 DRY RUN (preview)'}`)
  console.log('═'.repeat(60) + '\n')

  // Buscar animais por tag
  const byTag = await prisma.animal.findMany({
    where: {
      farmId: FARM_ID,
      tag:    { in: PARTOS.map(p => p.tag) },
    },
    select: { id: true, tag: true, name: true },
  })
  const tagMap = new Map(byTag.map(a => [a.tag, a]))

  // Buscar animais por nome (normalizado)
  const allFarm = await prisma.animal.findMany({
    where:  { farmId: FARM_ID, sex: 'FEMALE', status: 'ACTIVE' },
    select: { id: true, tag: true, name: true },
  })
  const nameMap = new Map(allFarm.map(a => [normalize(a.name ?? ''), a]))

  // Verificar eventos CALVING já existentes (para não duplicar)
  const existingCalvings = await prisma.reproduction.findMany({
    where:  { type: 'CALVING', animal: { farmId: FARM_ID } },
    select: { animalId: true, date: true },
  })
  const existingSet = new Set(existingCalvings.map(c => c.animalId))

  type Entry = { animal: { id: string; tag: string; name: string | null }; date: Date; label: string }
  const toCreate: Entry[] = []
  const skipped: string[] = []
  const notFound: string[] = []

  for (const p of PARTOS) {
    const animal = tagMap.get(p.tag)
    if (!animal) { notFound.push(`${p.tag} (${p.name})`); continue }
    if (existingSet.has(animal.id)) { skipped.push(`${p.tag} — já tem CALVING`); continue }
    toCreate.push({ animal, date: new Date(p.date + 'T12:00:00'), label: `${p.tag} · ${animal.name ?? p.name}` })
  }

  for (const p of PARTOS_BY_NAME) {
    const animal = nameMap.get(normalize(p.name))
    if (!animal) { notFound.push(`(nome) ${p.name}`); continue }
    if (existingSet.has(animal.id)) { skipped.push(`${animal.tag} ${p.name} — já tem CALVING`); continue }
    toCreate.push({ animal, date: new Date(p.date + 'T12:00:00'), label: `${animal.tag} · ${p.name}` })
  }

  console.log(`A criar: ${toCreate.length}  |  Já existem: ${skipped.length}  |  Não encontrados: ${notFound.length}\n`)

  for (const e of toCreate) {
    console.log(`  ✔ ${e.label.padEnd(30)} parto: ${e.date.toISOString().slice(0, 10)}`)
  }
  if (skipped.length > 0) {
    console.log('\n  Já possuem CALVING (ignorados):')
    for (const s of skipped) console.log(`    - ${s}`)
  }
  if (notFound.length > 0) {
    console.log('\n  ⚠ Não encontrados:')
    for (const n of notFound) console.log(`    - ${n}`)
  }

  if (!EXECUTE) {
    console.log(`\n🛑  DRY RUN — ${toCreate.length} eventos seriam criados. Use --execute para aplicar.\n`)
    await prisma.$disconnect()
    return
  }

  let created = 0
  for (const e of toCreate) {
    await prisma.reproduction.create({
      data: {
        animalId: e.animal.id,
        type:     'CALVING',
        status:   'CONFIRMED',
        date:     e.date,
        notes:    'Parto registrado via caderno PRO-SUI (maio–julho 2026)',
      },
    })
    created++
  }

  console.log(`\n✅ ${created} eventos CALVING criados com sucesso.`)
  console.log('   Vacas que pariram não aparecerão mais como prenhes.\n')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
