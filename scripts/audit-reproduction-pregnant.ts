/**
 * Audita animais que aparecem como "prenhes" na página de Reprodução.
 * Mostra todos os eventos reprodutivos e identifica por que ainda aparecem
 * na lista mesmo tendo parido.
 *
 * Uso: DATABASE_URL="..." npx tsx scripts/audit-reproduction-pregnant.ts
 */
import { prisma } from '../src/lib/prisma'
import { addDays, differenceInDays } from 'date-fns'

const FARM_ID = 'farm_saldanha'

async function main() {
  console.log('\n═══ AUDITORIA: ANIMAIS PRENHES NA PÁGINA DE REPRODUÇÃO ═══\n')

  // Replicar exatamente a query do getPregnantAnimals (SEM o filtro CALVING)
  type RawRow = {
    animalId: string
    status: string
    confirmedAt: Date
    nextCheckDate: Date | null
    tag: string
    name: string | null
  }

  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT latest.*
    FROM (
      SELECT DISTINCT ON (r."animalId")
        r."animalId"      AS "animalId",
        r.status,
        r.date            AS "confirmedAt",
        r."nextCheckDate",
        a.tag,
        a.name
      FROM reproductions r
      JOIN animals a ON a.id = r."animalId"
      WHERE r.type = 'PREGNANCY_CHECK'
        AND a."farmId" = ${FARM_ID}
        AND a.status   = 'ACTIVE'
      ORDER BY r."animalId", r.date DESC
    ) latest
    WHERE latest.status = 'CONFIRMED'
    ORDER BY latest."nextCheckDate" ASC NULLS LAST
  `

  console.log(`Total de "prenhes" (sem filtro CALVING): ${rows.length}\n`)

  const today = new Date()

  // Para cada prenhe, buscar todos os eventos reprodutivos
  for (const row of rows) {
    const expectedDate = row.nextCheckDate ?? addDays(row.confirmedAt, 280)
    const daysUntil   = differenceInDays(expectedDate, today)
    const status      = daysUntil < 0 ? `⚠ ATRASADO ${Math.abs(daysUntil)}d` : `OK ${daysUntil}d p/ parto`

    // Buscar TODOS os eventos desse animal
    const events = await prisma.reproduction.findMany({
      where:   { animalId: row.animalId },
      orderBy: { date: 'desc' },
      select:  { id: true, type: true, status: true, date: true, notes: true },
    })

    // Verificar se tem CALVING após o PREGNANCY_CHECK
    const hasCalvingAfter = events.some(
      e => e.type === 'CALVING' && e.date >= row.confirmedAt
    )

    const marker = hasCalvingAfter ? '✅ tem CALVING pós-check — DEVERIA SER FILTRADO' : '❌ sem CALVING pós-check — APARECE COMO PRENHE'

    console.log(`${row.tag.padEnd(12)} ${(row.name ?? '').padEnd(16)} ${status.padEnd(30)} ${marker}`)
    console.log(`  PREGNANCY_CHECK confirmedAt: ${row.confirmedAt.toISOString().slice(0,10)}  expectedCalving: ${expectedDate.toISOString().slice(0,10)}`)

    for (const e of events) {
      const afterFlag = e.type === 'CALVING' && e.date >= row.confirmedAt ? ' ← CALVING APÓS CHECK' : ''
      console.log(`    [${e.type.padEnd(18)}] [${e.status.padEnd(9)}] ${e.date.toISOString().slice(0,10)}${afterFlag}`)
    }
    console.log()
  }

  // Crias registradas mas mãe ainda na lista de prenhes
  console.log('\n─── VACAS COM CRIAS REGISTRADAS (maternalChildren) ─────────────\n')
  const withCrias = await prisma.animal.findMany({
    where: {
      farmId:          FARM_ID,
      status:          'ACTIVE',
      sex:             'FEMALE',
      maternalChildren: { some: {} },
    },
    select: {
      tag:  true,
      name: true,
      maternalChildren: {
        orderBy: { birthDate: 'desc' },
        select:  { tag: true, name: true, birthDate: true, sex: true },
        take: 3,
      },
    },
    orderBy: { tag: 'asc' },
  })

  for (const a of withCrias) {
    const inList = rows.some(r => r.tag === a.tag)
    const marker = inList ? '⚠  AINDA NA LISTA DE PRENHES' : '   ok'
    console.log(`${a.tag.padEnd(12)} ${(a.name ?? '').padEnd(16)} ${marker}`)
    for (const c of a.maternalChildren) {
      console.log(`    cria: ${c.tag} ${c.birthDate?.toISOString().slice(0,10) ?? 'sem data'} ${c.sex}`)
    }
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
