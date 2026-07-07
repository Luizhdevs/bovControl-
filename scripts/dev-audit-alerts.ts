import { prisma } from '../src/lib/prisma'

const FARM_ID = 'farm_saldanha'

async function main() {
  const alerts = await prisma.alert.findMany({
    where: { farmId: FARM_ID },
    select: {
      id: true, type: true, status: true, priority: true,
      title: true, description: true, dueDate: true,
      animal: { select: { id: true, tag: true, name: true, status: true, category: true, birthDate: true } },
      resolvedAt: true, createdAt: true,
    },
    orderBy: [{ type: 'asc' }, { status: 'asc' }],
  })

  console.log(`\nTotal alertas: ${alerts.length}\n`)

  // Agrupar por tipo
  const byType = new Map<string, typeof alerts>()
  for (const a of alerts) {
    if (!byType.has(a.type)) byType.set(a.type, [])
    byType.get(a.type)!.push(a)
  }

  for (const [type, list] of byType) {
    const pending  = list.filter(a => a.status === 'PENDING').length
    const resolved = list.filter(a => a.status === 'RESOLVED').length
    const dismissed = list.filter(a => a.status === 'DISMISSED').length
    console.log(`\n═══ [${type}]  total=${list.length}  PENDING=${pending}  RESOLVED=${resolved}  DISMISSED=${dismissed}`)

    for (const a of list) {
      const tag      = (a.animal?.tag  ?? 'N/A').padEnd(10)
      const name     = (a.animal?.name ?? '').padEnd(20)
      const cat      = (a.animal?.category ?? '').padEnd(8)
      const aniSt    = a.animal?.status ?? ''
      const bDate    = a.animal?.birthDate ? a.animal.birthDate.toISOString().slice(0, 10) : 'sem data'
      const due = a.dueDate ? a.dueDate.toISOString().slice(0, 10) : '—'
      console.log(`  [${a.status.padEnd(9)}] ${tag} ${name} ${cat} nasc=${bDate} animal=${aniSt} dueDate=${due}`)
      console.log(`               ${a.title}${a.description ? ' · ' + a.description.slice(0, 60) : ''}`)
    }
  }

  // Checagem de consistência
  console.log('\n\n─── CHECAGEM DE CONSISTÊNCIA ───────────────────')

  // 1. Alertas pendentes para animais inativos (mortos/vendidos)
  const orphaned = alerts.filter(a => a.status === 'PENDING' && a.animal?.status !== 'ACTIVE')
  console.log(`\nAlertas PENDING de animais não-ativos: ${orphaned.length}`)
  for (const a of orphaned) {
    console.log(`  ${a.type}  ${a.animal?.tag}  animal_status=${a.animal?.status}`)
  }

  // 2. Alertas sem animal vinculado
  const noAnimal = alerts.filter(a => !a.animal && a.status === 'PENDING')
  console.log(`\nAlertas PENDING sem animal vinculado: ${noAnimal.length}`)


  // 3. Tipos de alertas únicos
  console.log(`\nTipos distintos: ${[...byType.keys()].join(', ')}`)

  await prisma.$disconnect()
}

main()
