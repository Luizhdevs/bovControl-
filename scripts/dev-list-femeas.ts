import { prisma } from '../src/lib/prisma'

async function main() {
  const animals = await prisma.animal.findMany({
    where: { farmId: 'farm_saldanha', status: 'ACTIVE', sex: 'FEMALE' },
    select: { id: true, name: true, tag: true, category: true, breed: true },
    orderBy: { name: 'asc' },
  })
  animals.forEach(a =>
    console.log(a.tag.padEnd(10), a.category.padEnd(8), (a.name ?? '(sem nome)').toLowerCase()),
  )
  console.log('\nTotal fêmeas ativas:', animals.length)

  const last = await prisma.animal.findFirst({
    where:   { farmId: 'farm_saldanha' },
    orderBy: { tag: 'desc' },
    select:  { tag: true },
  })
  console.log('Última tag:', last?.tag)

  // last tag number for all (including calves created later)
  const allTags = await prisma.animal.findMany({
    where:   { farmId: 'farm_saldanha' },
    select:  { tag: true },
  })
  const nums = allTags.map(a => parseInt(a.tag.replace('BOV-', ''), 10)).filter(n => !isNaN(n))
  console.log('Maior número de brinco:', Math.max(...nums))
  await prisma.$disconnect()
}

main()
