/**
 * scripts/reset-dev.ts
 *
 * Apaga todos os dados operacionais da Fazenda Saldanha (dev).
 * Preserva: usuários, farm, farmUsers.
 * Remove: animais, lotes, pastos, leite, pesagens, saúde, reprodução, fotos, alertas.
 *
 * USO: npm run db:reset:dev
 *
 * ⚠️  Nunca executar em produção. Só roda em NODE_ENV = development | test.
 */

import { PrismaClient } from '@prisma/client'

const env = process.env.NODE_ENV ?? 'development'
if (!['development', 'test'].includes(env)) {
  console.error(`❌  reset-dev recusou rodar em NODE_ENV="${env}".`)
  process.exit(1)
}

const prisma  = new PrismaClient()
const FARM_ID = 'farm_saldanha'

async function main() {
  console.log(`🗑️   Resetando dados de desenvolvimento (farm: ${FARM_ID})...\n`)

  // Busca IDs dos animais para deletar tabelas sem FK direta para farmId
  const ids = (await prisma.animal.findMany({
    where:  { farmId: FARM_ID },
    select: { id: true },
  })).map(a => a.id)

  // Deleta em ordem correta para evitar violações de FK
  const [milk, alertsRes, weights, health, repro, photos, animalRes, lotsRes, pasturesRes] =
    await Promise.all([
      prisma.milkRecord.deleteMany({ where: { farmId: FARM_ID } }),
      prisma.alert.deleteMany({      where: { farmId: FARM_ID } }),
      ids.length ? prisma.weightRecord.deleteMany({ where: { animalId: { in: ids } } }) : Promise.resolve({ count: 0 }),
      ids.length ? prisma.healthEvent.deleteMany({  where: { animalId: { in: ids } } }) : Promise.resolve({ count: 0 }),
      ids.length ? prisma.reproduction.deleteMany({ where: { animalId: { in: ids } } }) : Promise.resolve({ count: 0 }),
      ids.length ? prisma.animalPhoto.deleteMany({  where: { animalId: { in: ids } } }) : Promise.resolve({ count: 0 }),
      prisma.animal.deleteMany({   where: { farmId: FARM_ID } }),
      prisma.lot.deleteMany({      where: { farmId: FARM_ID } }),
      prisma.pasture.deleteMany({  where: { farmId: FARM_ID } }),
    ])

  console.log('✅  Reset concluído. Registros removidos:')
  console.log(`   🥛  Leite:       ${milk.count}`)
  console.log(`   🔔  Alertas:     ${alertsRes.count}`)
  console.log(`   ⚖️   Pesagens:    ${weights.count}`)
  console.log(`   💉  Saúde:       ${health.count}`)
  console.log(`   💕  Reprodução:  ${repro.count}`)
  console.log(`   📸  Fotos:       ${photos.count}`)
  console.log(`   🐄  Animais:     ${animalRes.count}`)
  console.log(`   📦  Lotes:       ${lotsRes.count}`)
  console.log(`   🌿  Pastos:      ${pasturesRes.count}`)
  console.log('\n   Execute "npm run db:seed:dev" para repopular.\n')
}

main()
  .catch((e) => { console.error('❌  Erro no reset:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
