/**
 * prisma/seed-dev.ts
 *
 * Seed realístico para desenvolvimento — Fazenda Saldanha
 *
 * Gera ~315 animais + 60 dias de produção de leite + histórico
 * completo de pesagens, eventos de saúde, reprodução e alertas.
 *
 * USO:
 *   npm run db:seed:dev        → limpa dados + re-popula
 *   npm run db:reset:dev       → apenas limpa (sem re-popular)
 *
 * ⚠️  NUNCA executar em produção.
 *     Só roda se NODE_ENV = development | test.
 */

import { PrismaClient, type Prisma } from '@prisma/client'
import { hash }                       from 'bcryptjs'
import { subDays, addDays, addHours, startOfDay } from 'date-fns'
import { randomUUID }                 from 'node:crypto'

// ─── Guarda de ambiente ────────────────────────────────────

const env = process.env.NODE_ENV ?? 'development'
if (!['development', 'test'].includes(env)) {
  console.error(`❌  seed-dev.ts recusou rodar em NODE_ENV="${env}".`)
  console.error('    Só permitido em development ou test.')
  process.exit(1)
}

// ─── Cliente e constantes ──────────────────────────────────

const prisma  = new PrismaClient()
const FARM_ID = 'farm_saldanha'
const NOW     = new Date()

// ─── Helpers ───────────────────────────────────────────────

/** Número aleatório entre min e max, arredondado a `dec` casas. */
function rnd(min: number, max: number, dec = 1): number {
  const f = 10 ** dec
  return Math.round((Math.random() * (max - min) + min) * f) / f
}

/** Elemento aleatório de um array. */
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/** Retorna true com probabilidade `p`. */
function maybe(p: number): boolean {
  return Math.random() < p
}

/** Formata número como tag BOV-XXXX. */
function padTag(n: number): string {
  return `BOV-${String(n).padStart(4, '0')}`
}

// ─── Dados de referência ───────────────────────────────────

const COW_NAMES = [
  'Mimosa', 'Estrela', 'Bonita', 'Serena', 'Esperança', 'Pintada',
  'Branquinha', 'Fofinha', 'Maravilha', 'Florzinha', 'Manteiga', 'Serrana',
  'Vitória', 'Aurora', 'Brilhante', 'Carinha', 'Docinha', 'Graciosa',
  'Linda', 'Meiga', 'Rainha', 'Saudade', 'Ternura', 'Xodó', 'Alegria',
  'Caprichosa', 'Delicada', 'Famosa', 'Honesta', 'Jovial', 'Laranjinha',
  'Morena', 'Novinha', 'Orgulhosa', 'Perfeita', 'Querida', 'Robusta',
  'Suave', 'Travessa', 'Única', 'Valente', 'Zelosa', 'Bênção', 'Cristal',
  'Danada', 'Esbelta', 'Formosa', 'Harmonia', 'Imperial', 'Joia',
  'Kécia', 'Leitosa', 'Mansinha', 'Nativa', 'Obediente', 'Paçoca',
  'Quitéria', 'Rosinha', 'Saltitante', 'Tímida', 'Uberlândia', 'Venância',
] as const

const BULL_NAMES = ['Tornado', 'Trovão', 'Relâmpago', 'Bravo', 'Campeão'] as const

const BREEDS_DAIRY  = ['Girolando', 'Holandesa', 'Gir Leiteiro', 'Girolando 5/8'] as const
const BREEDS_BEEF   = ['Nelore', 'Angus', 'Brahman', 'Nelore Mocho'] as const
const BREEDS_MIXED  = ['Girolando', 'Mestiço', 'Simental'] as const

const HEALTH_MEDS   = ['Penicilina G', 'Oxitocina', 'Flunixin meglumine', 'Dexametasona',
                        'Enrofloxacina', 'Ceftiofur', 'Meloxicam'] as const
const DEWORM_MEDS   = ['Ivermectina 1%', 'Doramectina', 'Fenbendazol', 'Albendazol'] as const
const SEMEN_NAMES   = ['Sêmen Girolando A2', 'Sêmen Holandês Holstein', 'Sêmen Nelore Elite',
                        'Sêmen Gir Leiteiro 1A', 'Sêmen Girolando FIV'] as const
const DISEASE_DESCS = [
  'Mastite subclínica — CMT positivo, tratamento intramamário',
  'Tristeza parasitária — febre alta, anorexia',
  'Timpanismo gasoso — distensão ruminal aguda',
  'Edema de úbere — pós-parto recente',
  'Cetose subclínica — queda de produção pós-parto',
  'Papilomatose — lesões verrugosas na pele',
  'Diarréia neonatal — bezerro recém-nascido',
] as const

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seed realístico BovControl iniciado...\n')

  // ── 1. Usuários ────────────────────────────────────────
  const pw = await hash('bovcontrol123', 10)

  const [uAdmin, uManager, uWorker] = await Promise.all([
    prisma.user.upsert({
      where:  { email: 'admin@saldanha.com.br' },
      update: {},
      create: { name: 'Carlos Saldanha',  email: 'admin@saldanha.com.br',         passwordHash: pw },
    }),
    prisma.user.upsert({
      where:  { email: 'gerente@saldanha.com.br' },
      update: {},
      create: { name: 'Marcos Ferreira',  email: 'gerente@saldanha.com.br',        passwordHash: pw },
    }),
    prisma.user.upsert({
      where:  { email: 'funcionario@saldanha.com.br' },
      update: {},
      create: { name: 'João Silva',        email: 'funcionario@saldanha.com.br',   passwordHash: pw },
    }),
  ])
  console.log('✅  Usuários: admin, gerente, funcionário')

  // ── 2. Fazenda ─────────────────────────────────────────
  const farm = await prisma.farm.upsert({
    where:  { id: FARM_ID },
    update: { name: 'Fazenda Saldanha', city: 'Uberaba', state: 'MG' },
    create: { id: FARM_ID, name: 'Fazenda Saldanha', city: 'Uberaba', state: 'MG' },
  })

  await Promise.all([
    prisma.farmUser.upsert({
      where:  { farmId_userId: { farmId: farm.id, userId: uAdmin.id } },
      update: {},
      create: { farmId: farm.id, userId: uAdmin.id,   role: 'OWNER'   },
    }),
    prisma.farmUser.upsert({
      where:  { farmId_userId: { farmId: farm.id, userId: uManager.id } },
      update: {},
      create: { farmId: farm.id, userId: uManager.id, role: 'MANAGER' },
    }),
    prisma.farmUser.upsert({
      where:  { farmId_userId: { farmId: farm.id, userId: uWorker.id } },
      update: {},
      create: { farmId: farm.id, userId: uWorker.id,  role: 'WORKER'  },
    }),
  ])
  console.log(`✅  Fazenda: ${farm.name} (${farm.id})`)

  // ── 3. Limpeza de dados existentes do farm ─────────────
  console.log('\n🧹  Limpando dados existentes...')

  await prisma.milkRecord.deleteMany({ where: { farmId: farm.id } })
  await prisma.alert.deleteMany({ where: { farmId: farm.id } })

  // Busca IDs para cascatear deletes das tabelas sem FK direta para farmId
  const existingIds = (await prisma.animal.findMany({
    where:  { farmId: farm.id },
    select: { id: true },
  })).map(a => a.id)

  if (existingIds.length > 0) {
    await prisma.weightRecord.deleteMany({ where: { animalId: { in: existingIds } } })
    await prisma.healthEvent.deleteMany({  where: { animalId: { in: existingIds } } })
    await prisma.reproduction.deleteMany({ where: { animalId: { in: existingIds } } })
    await prisma.animalPhoto.deleteMany({  where: { animalId: { in: existingIds } } })
  }

  await prisma.animal.deleteMany({  where: { farmId: farm.id } })
  await prisma.lot.deleteMany({     where: { farmId: farm.id } })
  await prisma.pasture.deleteMany({ where: { farmId: farm.id } })
  console.log('✅  Dados limpos')

  // ── 4. Pastos ──────────────────────────────────────────
  type PastureSeed = { id: string; farmId: string; name: string; areaHectares: number; grassType: string; maxCapacity: number }
  const pastureData: PastureSeed[] = [
    { id: randomUUID(), farmId: farm.id, name: 'Pasto A', areaHectares: 15.0, grassType: 'Braquiária', maxCapacity: 65 },
    { id: randomUUID(), farmId: farm.id, name: 'Pasto B', areaHectares: 12.5, grassType: 'Tifton',      maxCapacity: 60 },
    { id: randomUUID(), farmId: farm.id, name: 'Pasto C', areaHectares: 10.0, grassType: 'Braquiária', maxCapacity: 45 },
    { id: randomUUID(), farmId: farm.id, name: 'Pasto D', areaHectares:  8.0, grassType: 'Napier',      maxCapacity: 70 },
    { id: randomUUID(), farmId: farm.id, name: 'Pasto E', areaHectares:  5.5, grassType: 'Bermuda',     maxCapacity: 50 },
  ]
  await prisma.pasture.createMany({ data: pastureData })
  const [pA, pB, pC, pD, pE] = pastureData as [PastureSeed, PastureSeed, PastureSeed, PastureSeed, PastureSeed]
  console.log(`✅  Pastos: ${pastureData.length}`)

  // ── 5. Lotes ───────────────────────────────────────────
  type LotSeed = { id: string; farmId: string; name: string; type: 'LACTATING'|'DRY'|'HEIFER'|'CALF'|'FATTENING'|'MIXED'; maxCapacity: number; pastureId: string }
  const lotData: LotSeed[] = [
    { id: randomUUID(), farmId: farm.id, name: 'Curral de Leite 1', type: 'LACTATING', maxCapacity: 65, pastureId: pA.id },
    { id: randomUUID(), farmId: farm.id, name: 'Curral de Leite 2', type: 'LACTATING', maxCapacity: 60, pastureId: pB.id },
    { id: randomUUID(), farmId: farm.id, name: 'Lote Seco',          type: 'DRY',       maxCapacity: 25, pastureId: pC.id },
    { id: randomUUID(), farmId: farm.id, name: 'Lote Novilhas 1',   type: 'HEIFER',    maxCapacity: 35, pastureId: pC.id },
    { id: randomUUID(), farmId: farm.id, name: 'Lote Novilhas 2',   type: 'HEIFER',    maxCapacity: 35, pastureId: pD.id },
    { id: randomUUID(), farmId: farm.id, name: 'Bezerreiro',         type: 'CALF',      maxCapacity: 50, pastureId: pE.id },
    { id: randomUUID(), farmId: farm.id, name: 'Engorda',            type: 'FATTENING', maxCapacity: 70, pastureId: pD.id },
    { id: randomUUID(), farmId: farm.id, name: 'Reprodutores',       type: 'MIXED',     maxCapacity: 10, pastureId: pA.id },
  ]
  await prisma.lot.createMany({ data: lotData })
  const [lotLeite1, lotLeite2, lotSeco, lotNov1, lotNov2, lotBezerreiro, lotEngorda, lotReprod] = lotData as LotSeed[]
  console.log(`✅  Lotes: ${lotData.length}`)

  // ── 6. Animais ─────────────────────────────────────────
  console.log('\n⏳  Gerando animais...')

  let tag = 1
  const animals: Prisma.AnimalCreateManyInput[] = []

  // Função auxiliar para criar dados de animal
  function mkAnimal(
    overrides: Partial<Prisma.AnimalCreateManyInput> & {
      sex: 'MALE'|'FEMALE'
      category: 'COW'|'HEIFER'|'CALF'|'BULL'|'STEER'
    },
  ): Prisma.AnimalCreateManyInput {
    return {
      id:         randomUUID(),
      farmId:     farm.id,
      tag:        padTag(tag++),
      breed:      'Mestiço',
      status:     'ACTIVE',
      purpose:    'DAIRY',
      entryDate:  NOW,
      ...overrides,
    }
  }

  // ── 6a. Vacas lactantes — Lote 1 (60 animais) ─────────
  const cows1: Prisma.AnimalCreateManyInput[] = Array.from({ length: 60 }, (_, i) => mkAnimal({
    name:      i < COW_NAMES.length ? COW_NAMES[i] : undefined,
    sex:       'FEMALE',
    category:  'COW',
    breed:     pick(BREEDS_DAIRY),
    purpose:   'DAIRY',
    birthDate: new Date(2017 + (i % 5), i % 12, 1 + (i % 28)),
    lotId:     lotLeite1!.id,
    entryDate: subDays(NOW, rnd(200, 800, 0)),
  }))
  animals.push(...cows1)

  // ── 6b. Vacas lactantes — Lote 2 (55 animais) ─────────
  const cows2: Prisma.AnimalCreateManyInput[] = Array.from({ length: 55 }, (_, i) => mkAnimal({
    name:      i + 60 < COW_NAMES.length ? COW_NAMES[i + 60] : undefined,
    sex:       'FEMALE',
    category:  'COW',
    breed:     pick(BREEDS_DAIRY),
    purpose:   'DAIRY',
    birthDate: new Date(2016 + (i % 6), (i * 3) % 12, 1 + (i % 28)),
    lotId:     lotLeite2!.id,
    entryDate: subDays(NOW, rnd(300, 1200, 0)),
  }))
  animals.push(...cows2)

  // ── 6c. Vacas secas (20 animais) ──────────────────────
  const dryCows: Prisma.AnimalCreateManyInput[] = Array.from({ length: 20 }, (_, i) => mkAnimal({
    sex:       'FEMALE',
    category:  'COW',
    breed:     pick(BREEDS_DAIRY),
    purpose:   'DAIRY',
    birthDate: new Date(2015 + (i % 7), (i * 2) % 12, 1 + (i % 28)),
    lotId:     lotSeco!.id,
    entryDate: subDays(NOW, rnd(500, 2000, 0)),
  }))
  animals.push(...dryCows)

  // ── 6d. Novilhas — Lote 1 (35 animais) ───────────────
  const heifers1: Prisma.AnimalCreateManyInput[] = Array.from({ length: 35 }, (_, i) => mkAnimal({
    sex:       'FEMALE',
    category:  'HEIFER',
    breed:     pick(BREEDS_DAIRY),
    purpose:   'DAIRY',
    birthDate: new Date(2022 + (i % 2), (i * 5) % 12, 1 + (i % 28)),
    lotId:     lotNov1!.id,
    entryDate: subDays(NOW, rnd(30, 400, 0)),
  }))
  animals.push(...heifers1)

  // ── 6e. Novilhas — Lote 2 (30 animais) ───────────────
  const heifers2: Prisma.AnimalCreateManyInput[] = Array.from({ length: 30 }, (_, i) => mkAnimal({
    sex:       'FEMALE',
    category:  'HEIFER',
    breed:     pick([...BREEDS_DAIRY, ...BREEDS_BEEF]),
    purpose:   maybe(0.7) ? 'DAIRY' : 'BEEF',
    birthDate: new Date(2022 + (i % 2), (i * 7) % 12, 1 + (i % 28)),
    lotId:     lotNov2!.id,
    entryDate: subDays(NOW, rnd(30, 400, 0)),
  }))
  animals.push(...heifers2)

  // ── 6f. Bezerros (45 animais — sexo misto) ────────────
  const calves: Prisma.AnimalCreateManyInput[] = Array.from({ length: 45 }, (_, i) => {
    const sex: 'MALE'|'FEMALE' = maybe(0.52) ? 'FEMALE' : 'MALE'
    return mkAnimal({
      sex,
      category:  'CALF',
      breed:     pick(BREEDS_DAIRY),
      purpose:   sex === 'FEMALE' ? 'DAIRY' : 'BOTH',
      birthDate: new Date(2024, (i * 3) % 12, 1 + (i % 28)),
      lotId:     lotBezerreiro!.id,
      entryDate: new Date(2024, (i * 3) % 12, 1 + (i % 28)),
      birthType: maybe(0.45) ? 'INSEMINATION' : 'NATURAL',
    })
  })
  animals.push(...calves)

  // ── 6g. Touros (5 animais) ────────────────────────────
  const bulls: Prisma.AnimalCreateManyInput[] = BULL_NAMES.map((name, i) => mkAnimal({
    name,
    sex:       'MALE',
    category:  'BULL',
    breed:     pick([...BREEDS_BEEF, 'Girolando']),
    purpose:   'BOTH',
    birthDate: new Date(2015 + i, (i * 3) % 12, 1 + i),
    lotId:     lotReprod!.id,
    entryDate: subDays(NOW, rnd(300, 2000, 0)),
  }))
  animals.push(...bulls)

  // ── 6h. Bois em engorda (55 animais) ──────────────────
  const steers: Prisma.AnimalCreateManyInput[] = Array.from({ length: 55 }, (_, i) => mkAnimal({
    sex:       'MALE',
    category:  'STEER',
    breed:     pick(BREEDS_BEEF),
    purpose:   'BEEF',
    birthDate: new Date(2021 + (i % 3), (i * 4) % 12, 1 + (i % 28)),
    lotId:     lotEngorda!.id,
    entryDate: subDays(NOW, rnd(30, 400, 0)),
  }))
  animals.push(...steers)

  // ── 6i. Histórico — vendidos/mortos (15 animais) ──────
  const STATUSES: Array<'SOLD'|'DEAD'|'TRANSFERRED'> = [
    'SOLD','SOLD','SOLD','SOLD','SOLD','SOLD','SOLD','SOLD',
    'DEAD','DEAD','DEAD','DEAD',
    'TRANSFERRED','TRANSFERRED','TRANSFERRED',
  ]
  const historical: Prisma.AnimalCreateManyInput[] = STATUSES.map((status, i) => {
    const exitDate = subDays(NOW, rnd(10, 200, 0))
    return mkAnimal({
      sex:        maybe(0.6) ? 'FEMALE' : 'MALE',
      category:   maybe(0.5) ? 'COW' : 'STEER',
      breed:      pick(BREEDS_MIXED),
      purpose:    'BOTH',
      status,
      birthDate:  new Date(2017 + (i % 5), i % 12, 1 + (i % 28)),
      entryDate:  subDays(exitDate, rnd(200, 800, 0)),
      exitDate,
      exitReason: status === 'SOLD'
        ? pick(['Venda para terceiros', 'Leilão', 'Negociação direta'])
        : status === 'DEAD'
        ? pick(['Morte súbita', 'Doença respiratória', 'Acidente', 'Complicação pós-parto'])
        : 'Transferência para outra unidade',
    })
  })
  animals.push(...historical)

  // ── Insere todos os animais ────────────────────────────
  await prisma.animal.createMany({ data: animals, skipDuplicates: true })

  const activeAnimals  = animals.filter(a => a.status === 'ACTIVE' || !a.status)
  const lactatingIds   = [...cows1, ...cows2].map(a => ({ id: a.id as string, base: rnd(15, 30) }))

  console.log(`✅  Animais: ${animals.length} total (${activeAnimals.length} ativos, ${historical.length} histórico)`)

  // ── 7. Registros de leite (60 dias) ───────────────────
  console.log('\n⏳  Gerando registros de leite (60 dias)...')

  const MILK_DAYS = 60
  const milkBatch: Prisma.MilkRecordCreateManyInput[] = []

  for (let d = MILK_DAYS; d >= 0; d--) {
    const day = subDays(startOfDay(NOW), d)

    for (const { id: animalId, base } of lactatingIds) {
      // ~12% de chance de não ordenhar (doença, falta do funcionário, etc.)
      if (maybe(0.12)) continue

      // Variação diária ±18%
      const daily      = base * (0.82 + Math.random() * 0.36)
      const mornPct    = 0.50 + Math.random() * 0.10  // 50–60% de manhã
      const morningL   = Math.round(daily * mornPct * 10) / 10
      const afternoonL = Math.round((daily - morningL)  * 10) / 10

      milkBatch.push(
        { animalId, farmId: farm.id, liters: morningL,   shift: 'MORNING',   recordedAt: addHours(day, 6)  },
        { animalId, farmId: farm.id, liters: afternoonL, shift: 'AFTERNOON', recordedAt: addHours(day, 14) },
      )
    }
  }

  // Insere em lotes de 2 000 para não estourar memória do statement
  const MILK_CHUNK = 2000
  for (let i = 0; i < milkBatch.length; i += MILK_CHUNK) {
    await prisma.milkRecord.createMany({ data: milkBatch.slice(i, i + MILK_CHUNK), skipDuplicates: true })
  }
  console.log(`✅  Registros de leite: ${milkBatch.length}`)

  // ── 8. Pesagens ───────────────────────────────────────
  console.log('\n⏳  Gerando pesagens...')

  const weightConfig: Record<string, { min: number; max: number }> = {
    COW:    { min: 420, max: 590 },
    HEIFER: { min: 220, max: 370 },
    CALF:   { min:  50, max: 160 },
    BULL:   { min: 650, max: 940 },
    STEER:  { min: 300, max: 550 },
  }

  const weightBatch: Prisma.WeightRecordCreateManyInput[] = []
  const WEIGHT_SAMPLE = 220  // número de animais a pesar

  for (const animal of activeAnimals.slice(0, WEIGHT_SAMPLE)) {
    const cfg = weightConfig[animal.category as string]
    if (!cfg) continue
    const base       = rnd(cfg.min, cfg.max)
    const nWeighings = 2 + Math.floor(Math.random() * 3)  // 2–4 pesagens

    for (let w = nWeighings - 1; w >= 0; w--) {
      const daysAgo     = w * rnd(55, 95, 0)
      const growthFactor = 1 + (nWeighings - 1 - w) * 0.03 * Math.random()
      weightBatch.push({
        animalId:   animal.id as string,
        weightKg:   Math.round(base * growthFactor * 10) / 10,
        measuredAt: subDays(NOW, daysAgo),
        notes:      maybe(0.2) ? pick(['Rotina mensal', 'Pré-venda', 'Pós-parto']) : null,
      })
    }
  }

  await prisma.weightRecord.createMany({ data: weightBatch, skipDuplicates: true })
  console.log(`✅  Pesagens: ${weightBatch.length}`)

  // ── 9. Eventos de saúde ───────────────────────────────
  console.log('\n⏳  Gerando eventos de saúde...')

  const healthBatch: Prisma.HealthEventCreateManyInput[] = []
  const femalesForHealth = [...cows1, ...cows2, ...dryCows, ...heifers1, ...heifers2]

  // Vacinação febre aftosa — campanha de 6 meses atrás (100 animais)
  for (const animal of femalesForHealth.slice(0, 100)) {
    healthBatch.push({
      animalId:    animal.id as string,
      type:        'VACCINATION',
      description: 'Vacinação contra Febre Aftosa — campanha semestral',
      medication:  'Aftosa Biovet',
      cost:        rnd(8, 15),
      occurredAt:  subDays(NOW, 175 + Math.floor(Math.random() * 15)),
      resolved:    true,
    })
  }

  // Vacinação brucelose — novilhas (3–8 meses)
  for (const animal of heifers1.slice(0, 20)) {
    healthBatch.push({
      animalId:    animal.id as string,
      type:        'VACCINATION',
      description: 'Vacinação contra Brucelose — dose única',
      medication:  'B19 Brucella Abortus',
      cost:        rnd(20, 35),
      occurredAt:  subDays(NOW, 30 + Math.floor(Math.random() * 60)),
      resolved:    true,
    })
  }

  // Vermifugação trimestral (80 animais)
  for (const animal of activeAnimals.slice(0, 80)) {
    healthBatch.push({
      animalId:    animal.id as string,
      type:        'DEWORMING',
      description: 'Vermifugação trimestral — controle de endo/ectoparasitos',
      medication:  pick(DEWORM_MEDS),
      cost:        rnd(5, 18),
      occurredAt:  subDays(NOW, 85 + Math.floor(Math.random() * 20)),
      resolved:    true,
    })
  }

  // Doenças individuais (14 casos)
  for (let d = 0; d < 14; d++) {
    const animal   = pick([...cows1, ...cows2])
    const resolved = maybe(0.78)
    healthBatch.push({
      animalId:    animal.id as string,
      type:        'DISEASE',
      description: pick(DISEASE_DESCS),
      medication:  pick(HEALTH_MEDS),
      cost:        rnd(50, 320),
      occurredAt:  subDays(NOW, rnd(3, 130, 0)),
      resolved,
      notes:       resolved
        ? 'Animal recuperado com sucesso após tratamento'
        : 'Em tratamento — retornar em 5 dias para reavaliação',
    })
  }

  // Exames (18 exames)
  for (let e = 0; e < 18; e++) {
    const animal = pick([...cows1, ...cows2, ...dryCows])
    healthBatch.push({
      animalId:    animal.id as string,
      type:        'EXAM',
      description: pick([
        'CMT — California Mastitis Test',
        'Tuberculinização — Teste de tuberculose',
        'Exame de brucelose — Antígeno Acidificado Tamponado',
        'Exame ginecológico — avaliação reprodutiva',
        'Ultrassonografia reprodutiva',
      ]),
      cost:      rnd(30, 120),
      occurredAt: subDays(NOW, rnd(7, 210, 0)),
      resolved:  true,
    })
  }

  await prisma.healthEvent.createMany({ data: healthBatch, skipDuplicates: true })
  console.log(`✅  Eventos de saúde: ${healthBatch.length}`)

  // ── 10. Reprodução ────────────────────────────────────
  console.log('\n⏳  Gerando eventos reprodutivos...')

  const reproBatch:   Prisma.ReproductionCreateManyInput[] = []
  const alertsBatch:  Prisma.AlertCreateManyInput[]         = []
  const reproAnimals  = [...cows1, ...cows2, ...dryCows, ...heifers1]

  // 32 inseminações / montas nos últimos 6 meses
  for (let i = 0; i < 32; i++) {
    const animal = pick(reproAnimals)
    const date   = subDays(NOW, rnd(10, 180, 0))
    const type: 'INSEMINATION'|'NATURAL_MATING' = maybe(0.72) ? 'INSEMINATION' : 'NATURAL_MATING'
    reproBatch.push({
      animalId:      animal.id as string,
      type,
      date,
      status:        'PENDING',
      bullName:      type === 'NATURAL_MATING' ? pick(BULL_NAMES) : pick(SEMEN_NAMES),
      nextCheckDate: addDays(date, 45),
    })
  }

  // 22 diagnósticos de gestação
  for (let i = 0; i < 22; i++) {
    const animal       = pick([...cows1, ...cows2, ...dryCows])
    const date         = subDays(NOW, rnd(15, 150, 0))
    const status: 'CONFIRMED'|'FAILED'|'PENDING' =
      i < 13 ? 'CONFIRMED' : i < 18 ? 'FAILED' : 'PENDING'
    const calvingDate  = addDays(date, 280)

    reproBatch.push({
      animalId:      animal.id as string,
      type:          'PREGNANCY_CHECK',
      date,
      status,
      nextCheckDate: status === 'CONFIRMED' ? calvingDate : null,
      result:        status === 'CONFIRMED'
        ? 'Prenhez confirmada via palpação retal / ultrassonografia'
        : status === 'FAILED'
        ? 'Diagnóstico negativo — animal vazio'
        : undefined,
    })

    if (status === 'CONFIRMED') {
      alertsBatch.push({
        farmId:      farm.id,
        animalId:    animal.id as string,
        type:        'CALVING',
        title:       `Parto previsto — ${animal.tag}`,
        description: 'Prenhez confirmada. Prepare o local de parição.',
        priority:    'HIGH',
        status:      calvingDate < NOW ? 'RESOLVED' : 'PENDING',
        dueDate:     calvingDate,
        resolvedAt:  calvingDate < NOW
          ? addDays(calvingDate, Math.floor(Math.random() * 5))
          : undefined,
      })
    }
  }

  await prisma.reproduction.createMany({ data: reproBatch, skipDuplicates: true })
  console.log(`✅  Eventos reprodutivos: ${reproBatch.length}`)

  // ── 11. Alertas ───────────────────────────────────────
  console.log('\n⏳  Gerando alertas...')

  // Vacinas vencendo (8)
  for (let i = 0; i < 8; i++) {
    const animal = pick([...cows1, ...cows2])
    alertsBatch.push({
      farmId:      farm.id,
      animalId:    animal.id as string,
      type:        'VACCINATION',
      title:       `Vacinação vencendo — ${animal.tag}`,
      description: 'Vacina de febre aftosa vence em breve. Agendar reforço.',
      priority:    'MEDIUM',
      status:      'PENDING',
      dueDate:     addDays(NOW, rnd(1, 25, 0)),
    })
  }

  // Pesagens pendentes (5)
  for (let i = 0; i < 5; i++) {
    const animal = pick([...heifers1, ...heifers2])
    alertsBatch.push({
      farmId:      farm.id,
      animalId:    animal.id as string,
      type:        'WEIGHT_CHECK',
      title:       `Pesagem pendente — ${animal.tag}`,
      description: 'Novilha não pesa há mais de 90 dias.',
      priority:    'LOW',
      status:      'PENDING',
      dueDate:     addDays(NOW, rnd(1, 15, 0)),
    })
  }

  // Cios detectados (7)
  for (let i = 0; i < 7; i++) {
    const animal = pick([...cows1, ...cows2])
    alertsBatch.push({
      farmId:      farm.id,
      animalId:    animal.id as string,
      type:        'HEAT',
      title:       `Cio detectado — ${animal.tag}`,
      description: 'Animal apresentou sinais de cio. Programar inseminação.',
      priority:    'HIGH',
      status:      maybe(0.4) ? 'RESOLVED' : 'PENDING',
      dueDate:     addDays(NOW, rnd(-2, 5, 0)),
    })
  }

  // DG pendentes (10)
  for (let i = 0; i < 10; i++) {
    const animal = pick([...cows1, ...cows2])
    alertsBatch.push({
      farmId:      farm.id,
      animalId:    animal.id as string,
      type:        'PREGNANCY_CHECK',
      title:       `DG pendente — ${animal.tag}`,
      description: 'Animal inseminado há 45+ dias. Realizar diagnóstico de gestação.',
      priority:    'MEDIUM',
      status:      'PENDING',
      dueDate:     addDays(NOW, rnd(1, 20, 0)),
    })
  }

  // Secagens (5)
  for (let i = 0; i < 5; i++) {
    const animal = pick(cows1)
    alertsBatch.push({
      farmId:      farm.id,
      animalId:    animal.id as string,
      type:        'DRY_OFF',
      title:       `Secagem prevista — ${animal.tag}`,
      description: 'Vaca prenhe deve ser seca para descanso pré-parto.',
      priority:    'MEDIUM',
      status:      'PENDING',
      dueDate:     addDays(NOW, rnd(1, 25, 0)),
    })
  }

  await prisma.alert.createMany({ data: alertsBatch, skipDuplicates: true })
  console.log(`✅  Alertas: ${alertsBatch.length}`)

  // ── 12. Sumário final ─────────────────────────────────
  const [totAnimals, totMilk, totWeights, totHealth, totRepro, totAlerts] = await Promise.all([
    prisma.animal.count({ where: { farmId: farm.id } }),
    prisma.milkRecord.count({ where: { farmId: farm.id } }),
    prisma.weightRecord.count({ where: { animal: { farmId: farm.id } } }),
    prisma.healthEvent.count({ where: { animal: { farmId: farm.id } } }),
    prisma.reproduction.count({ where: { animal: { farmId: farm.id } } }),
    prisma.alert.count({ where: { farmId: farm.id } }),
  ])

  console.log('\n🎉  Seed realístico concluído!')
  console.log('══════════════════════════════════════════')
  console.log(`🐄  Animais:              ${totAnimals}`)
  console.log(`🥛  Registros de leite:   ${totMilk}`)
  console.log(`⚖️   Pesagens:             ${totWeights}`)
  console.log(`💉  Eventos de saúde:     ${totHealth}`)
  console.log(`💕  Eventos reprodutivos: ${totRepro}`)
  console.log(`🔔  Alertas:              ${totAlerts}`)
  console.log('──────────────────────────────────────────')
  console.log('📧  admin@saldanha.com.br        (OWNER)')
  console.log('📧  gerente@saldanha.com.br      (MANAGER)')
  console.log('📧  funcionario@saldanha.com.br  (WORKER)')
  console.log('🔑  Senha: bovcontrol123')
  console.log('══════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('❌  Erro no seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
