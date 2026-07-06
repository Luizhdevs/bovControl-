/**
 * Registra os 24 partos de maio–julho 2026 no banco da Fazenda Saldanha.
 *
 * Ações:
 *   1. Cadastra 6 novilhas paridas como vacas (não estavam no sistema)
 *   2. Cria 24 bezerros vinculados às respectivas mães
 *
 * Preview (sem --execute):
 *   npx tsx scripts/dev-register-partos-2026.ts
 *
 * Executar em produção:
 *   DATABASE_URL="..." npx tsx scripts/dev-register-partos-2026.ts --execute
 */

import { prisma } from '../src/lib/prisma'

const FARM_ID = 'farm_saldanha'
const EXECUTE = process.argv.includes('--execute')

// ─── Partos do caderno ─────────────────────────────────────
// novilha: true  → mãe não estava cadastrada, precisa ser criada
// sexo: MALE | FEMALE  → sexo do bezerro
// data: yyyy-mm-dd  → data de nascimento do bezerro

const PARTOS = [
  { maeName: 'Piaba',     sexo: 'MALE'   as const, data: '2026-05-19', novilha: false },
  { maeName: 'Criolinha', sexo: 'FEMALE' as const, data: '2026-05-21', novilha: false },
  { maeName: 'Piabinha',  sexo: 'FEMALE' as const, data: '2026-05-23', novilha: false },
  { maeName: 'Azeitona',  sexo: 'MALE'   as const, data: '2026-05-28', novilha: false },
  { maeName: 'Canela',    sexo: 'FEMALE' as const, data: '2026-06-01', novilha: false },
  { maeName: 'Uberaba',   sexo: 'MALE'   as const, data: '2026-06-02', novilha: false },
  { maeName: 'Manhosa',   sexo: 'FEMALE' as const, data: '2026-06-03', novilha: false },
  { maeName: 'Lojinha',   sexo: 'FEMALE' as const, data: '2026-06-05', novilha: false },
  { maeName: 'Brasilia',  sexo: 'MALE'   as const, data: '2026-06-07', novilha: true  },
  { maeName: 'Luxosa',    sexo: 'FEMALE' as const, data: '2026-06-15', novilha: false },
  { maeName: 'Cassarola', sexo: 'FEMALE' as const, data: '2026-06-09', novilha: true  },
  { maeName: 'Perdiz',    sexo: 'FEMALE' as const, data: '2026-06-09', novilha: true  },
  { maeName: 'Boneca',    sexo: 'MALE'   as const, data: '2026-06-13', novilha: true  },
  { maeName: 'Ituitaba',  sexo: 'FEMALE' as const, data: '2026-06-15', novilha: false },
  { maeName: 'Cerveja',   sexo: 'MALE'   as const, data: '2026-06-15', novilha: false },
  { maeName: 'Rainha',    sexo: 'MALE'   as const, data: '2026-06-15', novilha: true  },
  { maeName: 'Espoleta',  sexo: 'FEMALE' as const, data: '2026-06-22', novilha: false },
  { maeName: 'Garca',     sexo: 'FEMALE' as const, data: '2026-06-23', novilha: false },
  { maeName: 'Cabana',    sexo: 'MALE'   as const, data: '2026-06-27', novilha: false },
  { maeName: 'Castanha',  sexo: 'MALE'   as const, data: '2026-06-27', novilha: true  },
  { maeName: 'Gaucha',    sexo: 'MALE'   as const, data: '2026-06-29', novilha: false },
  { maeName: 'Roxinha',   sexo: 'MALE'   as const, data: '2026-07-02', novilha: false },
  { maeName: 'Esmeralda', sexo: 'MALE'   as const, data: '2026-07-03', novilha: false },
  { maeName: 'Chitinha',  sexo: 'FEMALE' as const, data: '2026-07-03', novilha: false },
]

// ─── Helpers ───────────────────────────────────────────────

function pad(n: number) { return `BOV-${String(n).padStart(4, '0')}` }

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log('  REGISTRO DE PARTOS — MAIO/JULHO 2026')
  console.log(`  Banco:  ${(process.env.DATABASE_URL ?? 'local').replace(/\/\/[^:]*:[^@]*@/, '//****:****@')}`)
  console.log(`  Modo:   ${EXECUTE ? '🚀 EXECUÇÃO REAL' : '🔍 DRY RUN (preview)'}`)
  console.log('═'.repeat(60) + '\n')

  // ── 1. Carregar todos os animais da fazenda ─────────────
  const allAnimals = await prisma.animal.findMany({
    where:  { farmId: FARM_ID },
    select: { id: true, tag: true, name: true, breed: true, purpose: true },
  })

  const tagNums = allAnimals
    .map(a => parseInt(a.tag.replace('BOV-', ''), 10))
    .filter(n => !isNaN(n))
  let nextTag = Math.max(...tagNums) + 1

  // Índice por nome (lowercase sem acento para match robusto)
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  const byName = new Map<string, typeof allAnimals[0]>()
  for (const a of allAnimals) {
    if (a.name) byName.set(normalize(a.name), a)
  }

  // Breed/purpose default a partir de um animal existente
  const ref        = byName.get('piaba') ?? allAnimals[0]
  const defBreed   = ref?.breed   ?? 'Girolando'
  const defPurpose = ref?.purpose ?? 'DAIRY'

  console.log(`Último brinco: ${pad(nextTag - 1)}  →  próximo: ${pad(nextTag)}`)
  console.log(`Raça padrão: ${defBreed}  |  Finalidade: ${defPurpose}\n`)

  // ── 2. Verificar mães ──────────────────────────────────
  const novilhasACriar: string[] = []
  const maesNaoEncontradas: string[] = []

  for (const p of PARTOS) {
    const key = normalize(p.maeName)
    if (!byName.has(key)) {
      if (p.novilha) {
        novilhasACriar.push(p.maeName)
      } else {
        maesNaoEncontradas.push(p.maeName)
      }
    }
  }

  // ── 3. Preview ─────────────────────────────────────────
  console.log(`── Novilhas a cadastrar (${novilhasACriar.length}):`)
  let previewTag = nextTag
  novilhasACriar.forEach(n => {
    console.log(`   ✦ ${pad(previewTag++)} — ${n} (vaca)`)
  })

  if (maesNaoEncontradas.length > 0) {
    console.log(`\n⚠️  Mães NÃO ENCONTRADAS e não marcadas como novilha:`)
    maesNaoEncontradas.forEach(n => console.log(`   ✗ ${n}`))
    console.log('   Adicione novilha: true ou corrija o nome antes de executar.\n')
    if (!EXECUTE) await prisma.$disconnect()
    if (!EXECUTE) return
  }

  console.log(`\n── Bezerros a criar (${PARTOS.length}):`)
  for (const p of PARTOS) {
    const key  = normalize(p.maeName)
    const mae  = byName.get(key)
    const maeLabel = mae
      ? `${mae.tag} ${p.maeName}`
      : novilhasACriar.includes(p.maeName)
        ? `${p.maeName} (nova)`
        : `??? ${p.maeName}`
    const sexLabel = p.sexo === 'MALE' ? 'Macho' : 'Fêmea'
    console.log(`   ${pad(previewTag++)} — ${sexLabel} | mãe: ${maeLabel} | ${p.data}`)
  }

  console.log(`\nTotal: ${novilhasACriar.length} vacas + ${PARTOS.length} bezerros`)

  if (!EXECUTE) {
    console.log('\n🛑  DRY RUN — nada alterado. Use --execute para aplicar.\n')
    await prisma.$disconnect()
    return
  }

  // ── 4. EXECUÇÃO ────────────────────────────────────────
  console.log('\n🚀 Executando...\n')

  // Criar novilhas
  const createdMothers = new Map<string, string>() // normName → id

  for (const maeName of novilhasACriar) {
    const tag = pad(nextTag++)
    const created = await prisma.animal.create({
      data: {
        farmId:     FARM_ID,
        tag,
        name:       maeName,
        sex:        'FEMALE',
        category:   'COW',
        status:     'ACTIVE',
        breed:      defBreed,
        purpose:    defPurpose,
        milkStatus: 'LACTATING',
      },
      select: { id: true },
    })
    createdMothers.set(normalize(maeName), created.id)
    console.log(`   ✦ Vaca criada: ${tag} — ${maeName}`)
  }

  // Criar bezerros
  let created = 0
  for (const p of PARTOS) {
    const key    = normalize(p.maeName)
    const maeId  = byName.get(key)?.id ?? createdMothers.get(key)

    if (!maeId) {
      console.log(`   ⚠️  Pulando bezerro de ${p.maeName} — mãe não encontrada`)
      continue
    }

    const tag     = pad(nextTag++)
    const sexLabel = p.sexo === 'MALE' ? 'Macho' : 'Fêmea'

    await prisma.animal.create({
      data: {
        farmId:     FARM_ID,
        tag,
        sex:        p.sexo,
        category:   'CALF',
        status:     'ACTIVE',
        breed:      defBreed,
        purpose:    defPurpose,
        milkStatus: 'NA',
        birthDate:  new Date(p.data + 'T12:00:00'),
        motherId:   maeId,
        fatherId:   null,
      },
    })

    console.log(`   ✓ ${tag} — Bezerro ${sexLabel} | mãe: ${p.maeName} | ${p.data}`)
    created++
  }

  console.log(`\n✅ Concluído: ${novilhasACriar.length} vacas + ${created} bezerros criados.`)
  console.log(`   Brincos: ${pad(nextTag - novilhasACriar.length - created)} → ${pad(nextTag - 1)}\n`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
