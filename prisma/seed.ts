/**
 * Seed inicial para desenvolvimento.
 * Cria a Fazenda Saldanha com um usuário admin e dados de exemplo.
 *
 * Executar: npm run db:seed
 */

import { PrismaClient } from '@prisma/client'
import { hash }         from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Usuário admin ──────────────────────────────────────

  const passwordHash = await hash('bovcontrol123', 12)

  const user = await prisma.user.upsert({
    where:  { email: 'admin@saldanha.com.br' },
    update: {},
    create: {
      name:         'Administrador',
      email:        'admin@saldanha.com.br',
      passwordHash,
    },
  })
  console.log('✅ Usuário criado:', user.email)

  // ── Fazenda Saldanha ───────────────────────────────────

  const farm = await prisma.farm.upsert({
    where:  { id: 'farm_saldanha' },
    update: {},
    create: {
      id:    'farm_saldanha',
      name:  'Fazenda Saldanha',
      city:  'Uberaba',
      state: 'MG',
    },
  })
  console.log('✅ Fazenda criada:', farm.name)

  // ── FarmUser (admin é owner) ───────────────────────────

  await prisma.farmUser.upsert({
    where:  { farmId_userId: { farmId: farm.id, userId: user.id } },
    update: {},
    create: {
      farmId: farm.id,
      userId: user.id,
      role:   'OWNER',
    },
  })
  console.log('✅ Vínculo farm-user criado')

  // ── Pastos ─────────────────────────────────────────────

  const pastures = await Promise.all([
    prisma.pasture.upsert({
      where:  { farmId_name: { farmId: farm.id, name: 'Pasto A' } },
      update: {},
      create: { farmId: farm.id, name: 'Pasto A', areaHectares: 12.5, grassType: 'Braquiária' },
    }),
    prisma.pasture.upsert({
      where:  { farmId_name: { farmId: farm.id, name: 'Pasto B' } },
      update: {},
      create: { farmId: farm.id, name: 'Pasto B', areaHectares: 8.0,  grassType: 'Tifton' },
    }),
  ])
  console.log('✅ Pastos criados:', pastures.length)

  // ── Lotes ──────────────────────────────────────────────

  const lots = await Promise.all([
    prisma.lot.upsert({
      where:  { farmId_name: { farmId: farm.id, name: 'Curral de Leite 1' } },
      update: {},
      create: {
        farmId:      farm.id,
        name:        'Curral de Leite 1',
        type:        'LACTATING',
        maxCapacity: 40,
        pastureId:   pastures[0].id,
      },
    }),
    prisma.lot.upsert({
      where:  { farmId_name: { farmId: farm.id, name: 'Lote Novilhas' } },
      update: {},
      create: {
        farmId:      farm.id,
        name:        'Lote Novilhas',
        type:        'HEIFER',
        maxCapacity: 30,
        pastureId:   pastures[1].id,
      },
    }),
    prisma.lot.upsert({
      where:  { farmId_name: { farmId: farm.id, name: 'Bezerreiro' } },
      update: {},
      create: {
        farmId:      farm.id,
        name:        'Bezerreiro',
        type:        'CALF',
        maxCapacity: 20,
      },
    }),
  ])
  console.log('✅ Lotes criados:', lots.length)

  // ── Animais de exemplo ─────────────────────────────────

  const animals = await Promise.all([
    // Vacas em lactação
    prisma.animal.upsert({
      where:  { farmId_tag: { farmId: farm.id, tag: 'BOV-0001' } },
      update: {},
      create: {
        farmId:    farm.id,
        tag:       'BOV-0001',
        name:      'Mimosa',
        sex:       'FEMALE',
        category:  'COW',
        breed:     'Girolando',
        purpose:   'DAIRY',
        birthDate: new Date('2020-03-15'),
        lotId:     lots[0].id,
      },
    }),
    prisma.animal.upsert({
      where:  { farmId_tag: { farmId: farm.id, tag: 'BOV-0002' } },
      update: {},
      create: {
        farmId:    farm.id,
        tag:       'BOV-0002',
        name:      'Estrela',
        sex:       'FEMALE',
        category:  'COW',
        breed:     'Holandesa',
        purpose:   'DAIRY',
        birthDate: new Date('2019-07-22'),
        lotId:     lots[0].id,
      },
    }),
    // Novilha
    prisma.animal.upsert({
      where:  { farmId_tag: { farmId: farm.id, tag: 'BOV-0003' } },
      update: {},
      create: {
        farmId:    farm.id,
        tag:       'BOV-0003',
        sex:       'FEMALE',
        category:  'HEIFER',
        breed:     'Nelore',
        purpose:   'BEEF',
        birthDate: new Date('2023-01-10'),
        lotId:     lots[1].id,
      },
    }),
    // Touro
    prisma.animal.upsert({
      where:  { farmId_tag: { farmId: farm.id, tag: 'BOV-0004' } },
      update: {},
      create: {
        farmId:    farm.id,
        tag:       'BOV-0004',
        name:      'Tornado',
        sex:       'MALE',
        category:  'BULL',
        breed:     'Nelore',
        purpose:   'BOTH',
        birthDate: new Date('2018-09-05'),
      },
    }),
  ])
  console.log('✅ Animais criados:', animals.length)

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('─────────────────────────────────')
  console.log('📧 Email:  admin@saldanha.com.br')
  console.log('🔑 Senha:  bovcontrol123')
  console.log('─────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
