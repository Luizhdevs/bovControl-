/**
 * DEV ONLY — Auditoria diagnóstica: verifica todos os farms e dados no banco atual.
 */
import { prisma } from '../src/lib/prisma'

const REPORT_ID = 'cmr5g23cf0002a94s1v0br3m6'

async function main() {
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  DIAGNÓSTICO — BANCO E FARMS')
  console.log(`  DATABASE_URL: ${(process.env.DATABASE_URL ?? 'NÃO DEFINIDA').replace(/\/\/[^:]*:[^@]*@/, '//USER:****@')}`)
  console.log('══════════════════════════════════════════════════════\n')

  // ── 1. Todas as farms ─────────────────────────────────
  const farms = await prisma.farm.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  console.log(`Farms no banco: ${farms.length}\n`)

  for (const f of farms) {
    const [animals, active, cows, heifers, reports, imported, snaps, linked, alerts, repros] = await Promise.all([
      prisma.animal.count({ where: { farmId: f.id } }),
      prisma.animal.count({ where: { farmId: f.id, status: 'ACTIVE' } }),
      prisma.animal.count({ where: { farmId: f.id, category: 'COW' } }),
      prisma.animal.count({ where: { farmId: f.id, category: 'HEIFER' } }),
      prisma.veterinaryReport.count({ where: { farmId: f.id } }),
      prisma.veterinaryReport.count({ where: { farmId: f.id, importStatus: 'IMPORTED' } }),
      prisma.veterinaryAnimalSnapshot.count({ where: { farmId: f.id } }),
      prisma.veterinaryAnimalSnapshot.count({ where: { farmId: f.id, animalId: { not: null } } }),
      prisma.alert.count({ where: { farmId: f.id } }),
      prisma.reproduction.count({ where: { animal: { farmId: f.id } } }),
    ])

    console.log(`Farm: ${f.name}`)
    console.log(`  id:      ${f.id}`)
    console.log(`  animals: total=${animals}  active=${active}  COW=${cows}  HEIFER=${heifers}`)
    console.log(`  vetRep:  total=${reports}  IMPORTED=${imported}`)
    console.log(`  snaps:   total=${snaps}  linked=${linked}`)
    console.log(`  alerts:  ${alerts}   reproductions: ${repros}`)
    console.log('')
  }

  // ── 2. Relatório específico ───────────────────────────
  const report = await prisma.veterinaryReport.findUnique({
    where:  { id: REPORT_ID },
    select: {
      id: true, farmId: true, importStatus: true,
      totalRows: true, matchedRows: true, unmatchedRows: true,
      externalFarmName: true, externalOwnerName: true,
    },
  })
  console.log(`\nRelatório ${REPORT_ID}:`)
  if (!report) {
    console.log('  ❌ NÃO ENCONTRADO neste banco!')
  } else {
    console.log(`  farmId:          ${report.farmId}`)
    console.log(`  importStatus:    ${report.importStatus}`)
    console.log(`  externalFarm:    ${report.externalFarmName}`)
    console.log(`  totalRows:       ${report.totalRows}`)
    console.log(`  matchedRows:     ${report.matchedRows}`)
    console.log(`  unmatchedRows:   ${report.unmatchedRows}`)

    // Amostrar animais criados
    const snapLinked = await prisma.veterinaryAnimalSnapshot.findMany({
      where:  { reportId: REPORT_ID, animalId: { not: null } },
      select: { animalId: true },
      take:   5,
    })
    const sampleIds = snapLinked.map((s) => s.animalId as string)
    if (sampleIds.length > 0) {
      const sampleAnimals = await prisma.animal.findMany({
        where:  { id: { in: sampleIds } },
        select: { id: true, tag: true, externalCode: true, farmId: true, status: true },
      })
      console.log('\n  Amostra de animais criados (primeiros 5):')
      sampleAnimals.forEach((a) =>
        console.log(`    tag=${a.tag}  ext=${a.externalCode}  farmId=${a.farmId}  status=${a.status}`),
      )
    }
  }

  // ── 3. FarmUsers para identificar quem é o OWNER ─────
  console.log('\n  FarmUsers (para identificar sessão):')
  const farmUsers = await prisma.farmUser.findMany({
    where:  { role: { in: ['OWNER', 'MANAGER'] } },
    select: { userId: true, farmId: true, role: true, farm: { select: { name: true } } },
    take:   10,
  })
  farmUsers.forEach((fu) =>
    console.log(`    userId=${fu.userId}  farmId=${fu.farmId}  farm="${fu.farm.name}"  role=${fu.role}`),
  )

  // ── 4. Usuários e sessões ──────────────────────────────
  console.log('\n  Usuários no banco:')
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
    take: 10,
  })
  users.forEach((u) => console.log(`    id=${u.id}  email=${u.email}  name=${u.name}`))
}

main()
  .catch((e) => { console.error('\n❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
