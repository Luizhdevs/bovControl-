/**
 * Remove alertas incorretos: vacas com CALVING_OVERDUE ou CALVING_SOON
 * cujos partos já foram registrados no caderno (maio–julho 2026).
 *
 * Preview:  npx tsx scripts/dev-cleanup-alerts.ts
 * Executar: DATABASE_URL="..." npx tsx scripts/dev-cleanup-alerts.ts --execute
 */
import { prisma } from '../src/lib/prisma'

const FARM_ID = 'farm_saldanha'
const EXECUTE = process.argv.includes('--execute')

// Vacas que já pariram (cruzamento com o caderno registrado):
// CALVING_OVERDUE — 11 vacas (parto já ocorreu, alerta nunca foi baixado)
const CALVING_OVERDUE_PARIU = [
  'BOV-0083', // Uberaba   → parto 02/06/2026
  'BOV-0057', // Cabana    → parto 27/06/2026
  'BOV-0058', // Canela    → parto 01/06/2026
  'BOV-0059', // Cerveja   → parto 15/06/2026
  'BOV-0062', // Criolinha → parto 21/05/2026
  'BOV-0065', // Espoleta  → parto 22/06/2026
  'BOV-0070', // Ituitaba  → parto 15/06/2026
  'BOV-0071', // Lojinha   → parto 05/06/2026
  'BOV-0074', // Manhosa   → parto 03/06/2026
  'BOV-0076', // Piaba     → parto 19/05/2026
  'BOV-0079', // Roxinha   → parto 02/07/2026
]

// CALVING_SOON — 2 vacas cujo parto já ocorreu antes da data prevista
const CALVING_SOON_PARIU = [
  'BOV-0032', // Garça    → parto 23/06/2026 (dueDate era 23/06)
  'BOV-0029', // Esmeralda → parto 03/07/2026 (dueDate era 02/08 — pariu antes)
]

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log('  LIMPEZA DE ALERTAS INCORRETOS')
  console.log(`  Modo: ${EXECUTE ? '🚀 EXECUÇÃO REAL' : '🔍 DRY RUN (preview)'}`)
  console.log('═'.repeat(60) + '\n')

  // Busca alertas CALVING_OVERDUE para vacas que já pariram
  const overdueToDelete = await prisma.alert.findMany({
    where: {
      farmId: FARM_ID,
      type:   'CALVING_OVERDUE',
      status: 'PENDING',
      animal: { tag: { in: CALVING_OVERDUE_PARIU } },
    },
    select: {
      id: true,
      type: true,
      title: true,
      animal: { select: { tag: true, name: true } },
    },
  })

  // Busca alertas CALVING_SOON para vacas que já pariram
  const soonToDelete = await prisma.alert.findMany({
    where: {
      farmId: FARM_ID,
      type:   'CALVING_SOON',
      status: 'PENDING',
      animal: { tag: { in: CALVING_SOON_PARIU } },
    },
    select: {
      id: true,
      type: true,
      title: true,
      animal: { select: { tag: true, name: true } },
    },
  })

  const toDelete = [...overdueToDelete, ...soonToDelete]

  console.log(`Alertas a remover (${toDelete.length}):`)
  for (const a of toDelete) {
    console.log(`  ✗ ${a.type.padEnd(18)} ${a.animal?.tag?.padEnd(10)} ${a.animal?.name ?? ''}`)
    console.log(`      ${a.title}`)
  }

  if (toDelete.length === 0) {
    console.log('  Nenhum alerta incorreto encontrado.')
    await prisma.$disconnect()
    return
  }

  if (!EXECUTE) {
    console.log(`\n🛑  DRY RUN — ${toDelete.length} alertas seriam deletados. Use --execute para aplicar.\n`)
    await prisma.$disconnect()
    return
  }

  // Execução
  const ids = toDelete.map(a => a.id)
  const { count } = await prisma.alert.deleteMany({
    where: { id: { in: ids } },
  })

  console.log(`\n✅ ${count} alertas removidos com sucesso.`)

  // Contagem final
  const remaining = await prisma.alert.count({ where: { farmId: FARM_ID, status: 'PENDING' } })
  console.log(`   Alertas PENDING restantes: ${remaining}\n`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
