/**
 * scripts/storage-audit.ts
 *
 * Recalcula storageUsedMb e imageCount para todas as fazendas
 * a partir do somatório real das linhas em animal_photos.
 *
 * Uso:
 *   npx tsx scripts/storage-audit.ts
 *   npx tsx scripts/storage-audit.ts --fix    # aplica as correções
 *   npx tsx scripts/storage-audit.ts --farmId <id>  # audita só uma fazenda
 *
 * Seguro para produção: sem --fix, apenas reporta divergências.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const args   = process.argv.slice(2)
  const fix    = args.includes('--fix')
  const fidIdx = args.indexOf('--farmId')
  const farmFilter = fidIdx !== -1 ? args[fidIdx + 1] : undefined

  console.log(`\n🔍 Storage Audit — ${new Date().toISOString()}`)
  console.log(`   Modo: ${fix ? '✏️  FIX (aplicará correções)' : '📋 DRY RUN (somente leitura)'}`)
  if (farmFilter) console.log(`   Fazenda: ${farmFilter}`)
  console.log('')

  const farms = await prisma.farm.findMany({
    where: farmFilter ? { id: farmFilter } : undefined,
    select: { id: true, name: true, storageUsedMb: true, imageCount: true },
    orderBy: { name: 'asc' },
  })

  if (farms.length === 0) {
    console.log('⚠️  Nenhuma fazenda encontrada.')
    return
  }

  let totalFixed = 0
  let totalOk    = 0

  for (const farm of farms) {
    const agg = await prisma.animalPhoto.aggregate({
      where: { animal: { farmId: farm.id } },
      _count: { id: true },
      _sum:   { sizeKb: true },
    })

    const realCount     = agg._count.id
    const realSizeKb    = agg._sum.sizeKb ?? 0
    const realStorageMb = realSizeKb / 1024

    const countDiff   = realCount - farm.imageCount
    const storageDiff = realStorageMb - farm.storageUsedMb

    const hasDrift =
      Math.abs(countDiff) > 0 ||
      Math.abs(storageDiff) > 0.01  // tolerância de 10 KB

    if (hasDrift) {
      totalFixed++
      console.log(`❌ ${farm.name} (${farm.id})`)
      console.log(`   imageCount   : banco=${farm.imageCount}  real=${realCount}  diff=${countDiff > 0 ? '+' : ''}${countDiff}`)
      console.log(`   storageUsedMb: banco=${farm.storageUsedMb.toFixed(3)}  real=${realStorageMb.toFixed(3)}  diff=${storageDiff > 0 ? '+' : ''}${storageDiff.toFixed(3)}`)

      if (fix) {
        await prisma.farm.update({
          where: { id: farm.id },
          data:  { imageCount: realCount, storageUsedMb: realStorageMb },
        })
        console.log(`   ✅ Corrigido.`)
      }
    } else {
      totalOk++
      const storMb = farm.storageUsedMb.toFixed(1)
      console.log(`✅ ${farm.name}: ${farm.imageCount} fotos · ${storMb} MB`)
    }
  }

  console.log('')
  console.log(`─── Resultado ───────────────────────────────────────────`)
  console.log(`   Total de fazendas: ${farms.length}`)
  console.log(`   OK:        ${totalOk}`)
  console.log(`   Com drift: ${totalFixed}${fix ? ' (corrigidos)' : ' (use --fix para corrigir)'}`)
  console.log('')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[storage-audit] Erro:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
