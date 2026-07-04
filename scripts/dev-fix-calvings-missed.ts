/**
 * Registra eventos CALVING para as 13 vacas que foram ignoradas pelo script anterior
 * porque já tinham CALVING antigos (de 2025). O script anterior usava verificação
 * incorreta — checar se existe qualquer CALVING, não se existe CALVING após a inseminação.
 *
 * Preview:  npx tsx scripts/dev-fix-calvings-missed.ts
 * Executar: DATABASE_URL="..." npx tsx scripts/dev-fix-calvings-missed.ts --execute
 */
import { prisma } from '../src/lib/prisma'

const FARM_ID = 'farm_saldanha'
const EXECUTE = process.argv.includes('--execute')

// As 13 vacas que o script anterior pulou incorretamente
const PARTOS: { tag: string; name: string; date: string }[] = [
  { tag: 'BOV-0076', name: 'Piaba',     date: '2026-05-19' },
  { tag: 'BOV-0062', name: 'Criolinha', date: '2026-05-21' },
  { tag: 'BOV-0058', name: 'Canela',    date: '2026-06-01' },
  { tag: 'BOV-0083', name: 'Uberaba',   date: '2026-06-02' },
  { tag: 'BOV-0074', name: 'Manhosa',   date: '2026-06-03' },
  { tag: 'BOV-0071', name: 'Lojinha',   date: '2026-06-05' },
  { tag: 'BOV-0070', name: 'Ituitaba',  date: '2026-06-15' },
  { tag: 'BOV-0059', name: 'Cerveja',   date: '2026-06-15' },
  { tag: 'BOV-0065', name: 'Espoleta',  date: '2026-06-22' },
  { tag: 'BOV-0032', name: 'Garça',     date: '2026-06-23' },
  { tag: 'BOV-0057', name: 'Cabana',    date: '2026-06-27' },
  { tag: 'BOV-0079', name: 'Roxinha',   date: '2026-07-02' },
  { tag: 'BOV-0029', name: 'Esmeralda', date: '2026-07-03' },
]

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log('  CORREÇÃO: CALVINGS DE 2026 NÃO REGISTRADOS')
  console.log(`  Modo: ${EXECUTE ? '🚀 EXECUÇÃO REAL' : '🔍 DRY RUN (preview)'}`)
  console.log('═'.repeat(60) + '\n')

  const animals = await prisma.animal.findMany({
    where:  { farmId: FARM_ID, tag: { in: PARTOS.map(p => p.tag) } },
    select: { id: true, tag: true, name: true },
  })
  const animalMap = new Map(animals.map(a => [a.tag, a]))

  // Verificar CALVING existentes pós-inseminação (a checagem correta)
  const existingCalvings = await prisma.reproduction.findMany({
    where: {
      type:   'CALVING',
      animal: { farmId: FARM_ID, tag: { in: PARTOS.map(p => p.tag) } },
      date:   { gte: new Date('2026-01-01') }, // só calvings de 2026
    },
    select: { animalId: true, date: true },
  })
  const alreadyHas2026 = new Set(existingCalvings.map(c => c.animalId))

  type Entry = { animal: { id: string; tag: string; name: string | null }; date: Date; label: string }
  const toCreate: Entry[] = []
  const skipped: string[] = []

  for (const p of PARTOS) {
    const animal = animalMap.get(p.tag)
    if (!animal) { console.log(`  ⚠ Não encontrado: ${p.tag}`); continue }
    if (alreadyHas2026.has(animal.id)) {
      skipped.push(`${p.tag} · ${p.name} — já tem CALVING de 2026`)
      continue
    }
    toCreate.push({
      animal,
      date:  new Date(p.date + 'T12:00:00'),
      label: `${p.tag} · ${p.name}`,
    })
  }

  console.log(`A criar: ${toCreate.length}  |  Já têm CALVING 2026: ${skipped.length}\n`)

  for (const e of toCreate) {
    console.log(`  ✔ ${e.label.padEnd(28)} parto: ${e.date.toISOString().slice(0, 10)}`)
  }
  if (skipped.length) {
    console.log('\n  Já OK:')
    for (const s of skipped) console.log(`    - ${s}`)
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
        notes:    'Parto confirmado via caderno PRO-SUI (correção)',
      },
    })
    created++
    console.log(`  ✅ ${e.label}`)
  }

  console.log(`\n✅ ${created} eventos CALVING criados.`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
