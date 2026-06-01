/**
 * prisma/seed-dev.ts - Fazenda Perdigao/MG (Sprint 7.1)
 * NUNCA executar em producao.
 */

import { PrismaClient } from '@prisma/client'
import { hash }         from 'bcryptjs'
import { subDays, startOfDay } from 'date-fns'
import { randomUUID }   from 'node:crypto'

const env = process.env.NODE_ENV ?? 'development'
if (!['development', 'test'].includes(env)) {
  console.error('seed-dev.ts recusou rodar em producao.')
  process.exit(1)
}

const prisma = new PrismaClient()
const NOW    = new Date()
const FARM_ID = 'farm_perdigao_dev'

function rnd(min: number, max: number, dec = 1): number {
  const v = min + Math.random() * (max - min)
  return Math.round(v * 10 ** dec) / 10 ** dec
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function daysBefore(n: number): Date {
  return new Date(NOW.getTime() - n * 86_400_000)
}

let tagCounter = 1
function nextTag(): string {
  return `BOV-${String(tagCounter++).padStart(4, '0')}`
}

async function cleanDev() {
  console.log('  Limpando dados antigos...')
  await prisma.milkingSessionParticipant.deleteMany({ where: { session: { farmId: FARM_ID } } })
  await prisma.milkingSession.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.milkRecord.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.alert.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.auditLog.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.reproduction.deleteMany({ where: { animal: { farmId: FARM_ID } } })
  await prisma.healthEvent.deleteMany({ where: { animal: { farmId: FARM_ID } } })
  await prisma.weightRecord.deleteMany({ where: { animal: { farmId: FARM_ID } } })
  await prisma.animalPhoto.deleteMany({ where: { animal: { farmId: FARM_ID } } })
  await prisma.animalFeedConsumption.deleteMany({ where: { animal: { farmId: FARM_ID } } })
  await prisma.feedSession.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.feedType.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.animal.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.lot.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.pasture.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.farmSettings.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.invite.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.farmUser.deleteMany({ where: { farmId: FARM_ID } })
  await prisma.farm.deleteMany({ where: { id: FARM_ID } })
}

async function main() {
  console.log('\nBovControl seed-dev - Fazenda Perdigao/MG\n')
  await cleanDev()

  const pwHash  = await hash('bovcontrol123', 12)
  const owner   = await prisma.user.upsert({ where: { email: 'admin@perdigao.com.br'   }, update: { passwordHash: pwHash }, create: { name: 'Admin Perdigao',    email: 'admin@perdigao.com.br',    passwordHash: pwHash } })
  const manager = await prisma.user.upsert({ where: { email: 'gerente@perdigao.com.br' }, update: { passwordHash: pwHash }, create: { name: 'Gerente Perdigao',  email: 'gerente@perdigao.com.br',  passwordHash: pwHash } })
  const worker  = await prisma.user.upsert({ where: { email: 'operador@perdigao.com.br'}, update: { passwordHash: pwHash }, create: { name: 'Operador Perdigao', email: 'operador@perdigao.com.br', passwordHash: pwHash } })

  const farm = await prisma.farm.create({
    data: {
      id: FARM_ID, name: 'Fazenda Perdigao', city: 'Perdigao', state: 'MG',
      users: { create: [{ userId: owner.id, role: 'OWNER' }, { userId: manager.id, role: 'MANAGER' }, { userId: worker.id, role: 'WORKER' }] },
    },
  })

  console.log('  Criando pastos...')
  const pCurral  = await prisma.pasture.create({ data: { farmId: FARM_ID, name: 'Curral Principal', areaHectares: 15, grassType: 'Brachiaria', maxCapacity: 120 } })
  const pCentico = await prisma.pasture.create({ data: { farmId: FARM_ID, name: 'Centico',          areaHectares: 40, grassType: 'Panicum',    maxCapacity: 200 } })
  await prisma.pasture.create({ data: { farmId: FARM_ID, name: 'Coelho', areaHectares: 30, grassType: 'Brachiaria', maxCapacity: 150 } })
  const pDenis   = await prisma.pasture.create({ data: { farmId: FARM_ID, name: 'Denis',   areaHectares: 25, grassType: 'Estrela',    maxCapacity: 100 } })
  const pHeranca = await prisma.pasture.create({ data: { farmId: FARM_ID, name: 'Heranca', areaHectares: 50, grassType: 'Panicum',    maxCapacity: 250 } })

  console.log('  Criando lotes...')
  const lotLeite  = await prisma.lot.create({ data: { farmId: FARM_ID, name: 'Vacas Leite',         type: 'LACTATING', maxCapacity: 80,  pastureId: pCurral.id  } })
  const lotSecas  = await prisma.lot.create({ data: { farmId: FARM_ID, name: 'Vacas Secas Prenhas', type: 'DRY',       maxCapacity: 40,  pastureId: pDenis.id   } })
  const lotBezerr = await prisma.lot.create({ data: { farmId: FARM_ID, name: 'Bezerreiro',          type: 'CALF',      maxCapacity: 80,  pastureId: pCentico.id } })
  const lotRecria = await prisma.lot.create({ data: { farmId: FARM_ID, name: 'Recria',              type: 'HEIFER',    maxCapacity: 60,  pastureId: pHeranca.id } })
  const lotEngord = await prisma.lot.create({ data: { farmId: FARM_ID, name: 'Engorda',             type: 'FATTENING', maxCapacity: 100, pastureId: pHeranca.id } })
  const lotReprod = await prisma.lot.create({ data: { farmId: FARM_ID, name: 'Reprodutores',        type: 'BREEDING',  maxCapacity: 10,  pastureId: pCurral.id  } })

  console.log('  Configurando FarmSettings...')
  await prisma.farmSettings.create({
    data: { farmId: FARM_ID, mainProductionLotId: lotLeite.id, enableMilkParticipants: true, autoUpdateMilkStatus: true, useEstimatedMilkPerCow: true },
  })

  console.log('  Gerando animais...')
  const breeds = ['Girolando', 'Holandesa', 'Jersey', 'Gir Leiteiro', 'Mestico']
  const vacasLeiteIds: string[] = []
  const vacasSecasIds: string[] = []

  for (let i = 0; i < 62; i++) {
    const a = await prisma.animal.create({ data: { farmId: FARM_ID, tag: nextTag(), sex: 'FEMALE', category: 'COW',    breed: pick(breeds), status: 'ACTIVE', purpose: 'DAIRY', milkStatus: 'LACTATING',    lotId: lotLeite.id,  birthDate: daysBefore(rnd(1000, 2500, 0)) } })
    vacasLeiteIds.push(a.id)
  }
  for (let i = 0; i < 28; i++) {
    const a = await prisma.animal.create({ data: { farmId: FARM_ID, tag: nextTag(), sex: 'FEMALE', category: 'COW',    breed: pick(breeds), status: 'ACTIVE', purpose: 'DAIRY', milkStatus: 'DRY_PREGNANT', lotId: lotSecas.id,  birthDate: daysBefore(rnd(1200, 2800, 0)) } })
    vacasSecasIds.push(a.id)
  }
  for (let i = 0; i < 55; i++) {
    const sx = pick(['MALE', 'FEMALE']) as 'MALE' | 'FEMALE'
    await prisma.animal.create({ data: { farmId: FARM_ID, tag: nextTag(), sex: sx, category: 'CALF', breed: pick(breeds), status: 'ACTIVE', purpose: 'DAIRY', milkStatus: 'NA', lotId: lotBezerr.id, birthDate: daysBefore(rnd(30, 180, 0)) } })
  }
  for (let i = 0; i < 40; i++) {
    await prisma.animal.create({ data: { farmId: FARM_ID, tag: nextTag(), sex: 'FEMALE', category: 'HEIFER', breed: pick(breeds), status: 'ACTIVE', purpose: 'DAIRY', milkStatus: 'HEIFER', lotId: lotRecria.id, birthDate: daysBefore(rnd(300, 700, 0)) } })
  }
  for (let i = 0; i < 50; i++) {
    const cat = pick(['STEER', 'CALF']) as 'STEER' | 'CALF'
    await prisma.animal.create({ data: { farmId: FARM_ID, tag: nextTag(), sex: 'MALE', category: cat, breed: pick(['Nelore', 'Angus', 'Mestico']), status: 'ACTIVE', purpose: 'BEEF', milkStatus: 'NA', lotId: lotEngord.id, birthDate: daysBefore(rnd(180, 600, 0)) } })
  }
  for (let i = 0; i < 6; i++) {
    await prisma.animal.create({ data: { farmId: FARM_ID, tag: nextTag(), sex: 'MALE', category: 'BULL', breed: pick(['Gir', 'Girolando', 'Nelore']), status: 'ACTIVE', purpose: 'DAIRY', milkStatus: 'NA', lotId: lotReprod.id, birthDate: daysBefore(rnd(900, 2000, 0)) } })
  }

  console.log('  Gerando reproducoes...')
  for (const animalId of vacasSecasIds) {
    const tp = pick(['INSEMINATION', 'NATURAL_MATING']) as 'INSEMINATION' | 'NATURAL_MATING'
    await prisma.reproduction.create({ data: { animalId, type: tp, status: 'CONFIRMED', date: daysBefore(rnd(60, 200, 0)), notes: 'Gestacao confirmada por ultrassom.' } })
  }
  for (const animalId of vacasLeiteIds.slice(0, 12)) {
    await prisma.reproduction.create({ data: { animalId, type: 'INSEMINATION', status: 'CONFIRMED', date: daysBefore(rnd(30, 90, 0)) } })
  }

  console.log('  Gerando 90 dias de ordenha com participantes...')
  for (let d = 89; d >= 0; d--) {
    const sessionDate = startOfDay(subDays(NOW, d))
    for (const shift of ['MORNING', 'AFTERNOON'] as const) {
      const count       = Math.min(Math.floor(rnd(57, 62, 0)), vacasLeiteIds.length)
      const selected    = [...vacasLeiteIds].sort(() => Math.random() - 0.5).slice(0, count)
      const totalLiters = Math.round(count * rnd(8.5, 12.5) * 10) / 10
      const lpCow       = Math.round(totalLiters / count * 10) / 10

      const sess = await prisma.milkingSession.create({
        data: { farmId: FARM_ID, shift, date: sessionDate, totalLiters, milkingCows: count, idempotencyKey: randomUUID() },
      })

      await prisma.milkingSessionParticipant.createMany({
        data: selected.map((animalId) => ({ sessionId: sess.id, animalId, liters: lpCow, isEstimated: true, idempotencyKey: randomUUID() })),
        skipDuplicates: true,
      })
    }
  }

  console.log('  Gerando alertas...')
  const alertAnimals = [...vacasSecasIds.slice(0, 5), ...vacasLeiteIds.slice(0, 3)]
  const alertTypes   = ['PREGNANCY_CHECK', 'CALVING', 'DRY_OFF'] as Array<'PREGNANCY_CHECK' | 'CALVING' | 'DRY_OFF'>
  const priorities   = ['HIGH', 'MEDIUM'] as Array<'HIGH' | 'MEDIUM'>
  for (const animalId of alertAnimals) {
    await prisma.alert.create({ data: { farmId: FARM_ID, animalId, type: pick(alertTypes), title: 'Verificacao necessaria', priority: pick(priorities), status: 'PENDING', dueDate: new Date(NOW.getTime() + rnd(1, 15, 0) * 86400000) } })
  }

  const [sessions, participants, animals] = await Promise.all([
    prisma.milkingSession.count({ where: { farmId: FARM_ID } }),
    prisma.milkingSessionParticipant.count({ where: { session: { farmId: FARM_ID } } }),
    prisma.animal.count({ where: { farmId: FARM_ID } }),
  ])

  console.log('\nSeed concluido!')
  console.log(`  Fazenda : ${farm.name} -- ${farm.city}/${farm.state}`)
  console.log(`  Animais : ${animals}`)
  console.log(`  Sessoes : ${sessions} (${sessions / 2} dias x 2 turnos)`)
  console.log(`  Partic. : ${participants}`)
  console.log('\nLogins (senha: bovcontrol123)')
  console.log('  admin@perdigao.com.br')
  console.log('  gerente@perdigao.com.br')
  console.log('  operador@perdigao.com.br\n')

  void farm
  void lotSecas
  void lotBezerr
  void lotRecria
  void lotEngord
  void lotReprod
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
