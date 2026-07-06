/**
 * Registra 38 partos históricos (Jul/2025 – Mai/2026) da Fazenda Saldanha.
 *
 * Cria os bezerros vinculados às suas respectivas mães.
 * Se a mãe NÃO for encontrada pelo nome, o script a cadastra como vaca (NOVILHA).
 *
 * ⚠️  ATENÇÃO — data corrigida automaticamente:
 *   "pantera 27/12/26" → 27/12/2025 (data futura = erro de digitação)
 *
 * DRY RUN (preview — nada é alterado):
 *   DATABASE_URL="postgresql://..." npx tsx scripts/dev-register-partos-historico.ts
 *
 * EXECUTAR EM PRODUÇÃO:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/dev-register-partos-historico.ts --execute
 */

import { prisma } from '../src/lib/prisma'

const FARM_ID = 'farm_saldanha'
const EXECUTE = process.argv.includes('--execute')

// ─── Partos do caderno ─────────────────────────────────────
// novilha: true  → mãe provavelmente não está cadastrada; será criada como COW
// sexo: MALE | FEMALE  → sexo do bezerro
// data: yyyy-mm-dd  → data de nascimento do bezerro

const PARTOS = [
  // ── Maio/2026 ─────────────────────────────────────────────
  { maeName: 'Moema',       sexo: 'FEMALE' as const, data: '2026-05-03', novilha: false },
  { maeName: 'Brauna',      sexo: 'MALE'   as const, data: '2026-05-03', novilha: false },
  // ── Abril/2026 ────────────────────────────────────────────
  { maeName: 'Pretona',     sexo: 'FEMALE' as const, data: '2026-04-20', novilha: false },
  { maeName: 'Jabuticaba',  sexo: 'MALE'   as const, data: '2026-04-10', novilha: false },
  { maeName: 'Troxada',     sexo: 'FEMALE' as const, data: '2026-04-29', novilha: false },
  { maeName: 'Gemada',      sexo: 'MALE'   as const, data: '2026-04-29', novilha: false },
  // ── Março/2026 ────────────────────────────────────────────
  { maeName: 'Geralda',     sexo: 'FEMALE' as const, data: '2026-03-02', novilha: false },
  { maeName: 'Neneca',      sexo: 'FEMALE' as const, data: '2026-03-03', novilha: false }, // 2º parto (1º foi Out/2025)
  { maeName: 'Criola',      sexo: 'FEMALE' as const, data: '2026-03-03', novilha: false }, // 2º parto (1º foi Ago/2025)
  { maeName: 'Estrela',     sexo: 'FEMALE' as const, data: '2026-03-07', novilha: false },
  { maeName: 'Michel',      sexo: 'MALE'   as const, data: '2026-03-11', novilha: false },
  // ── Fevereiro/2026 ────────────────────────────────────────
  { maeName: 'Limeira',     sexo: 'FEMALE' as const, data: '2026-02-04', novilha: false },
  { maeName: 'Azulega',     sexo: 'FEMALE' as const, data: '2026-02-20', novilha: false },
  // ── Janeiro/2026 ──────────────────────────────────────────
  { maeName: 'Meia Noite',  sexo: 'FEMALE' as const, data: '2026-01-14', novilha: false },
  { maeName: 'Mariuza',     sexo: 'MALE'   as const, data: '2026-01-16', novilha: false },
  { maeName: 'Girafa',      sexo: 'MALE'   as const, data: '2026-01-27', novilha: false },
  // ── Dezembro/2025 ─────────────────────────────────────────
  { maeName: 'Pantera',     sexo: 'FEMALE' as const, data: '2025-12-27', novilha: false }, // ⚠️ original: "27/12/26" → corrigido para 2025
  { maeName: 'Perdigao',    sexo: 'MALE'   as const, data: '2025-12-15', novilha: false },
  { maeName: 'Bonitinha',   sexo: 'MALE'   as const, data: '2025-12-12', novilha: false },
  { maeName: 'Joana',       sexo: 'MALE'   as const, data: '2025-12-02', novilha: false },
  // ── Novembro/2025 ─────────────────────────────────────────
  { maeName: 'Shaquira',    sexo: 'MALE'   as const, data: '2025-11-17', novilha: false },
  { maeName: 'Renata',      sexo: 'MALE'   as const, data: '2025-11-17', novilha: false },
  // ── Outubro/2025 ──────────────────────────────────────────
  { maeName: 'Perdiz',      sexo: 'MALE'   as const, data: '2025-10-22', novilha: false },
  { maeName: 'Neneca',      sexo: 'MALE'   as const, data: '2025-10-20', novilha: false }, // 1º parto de Neneca
  { maeName: 'Gaivota',     sexo: 'MALE'   as const, data: '2025-10-07', novilha: false },
  { maeName: 'Canarinha',   sexo: 'MALE'   as const, data: '2025-10-02', novilha: false },
  // ── Setembro/2025 ─────────────────────────────────────────
  { maeName: 'Melodia',     sexo: 'MALE'   as const, data: '2025-09-29', novilha: false },
  { maeName: 'Dedega',      sexo: 'FEMALE' as const, data: '2025-09-16', novilha: false },
  { maeName: 'Milindrosa',  sexo: 'FEMALE' as const, data: '2025-09-10', novilha: false },
  { maeName: 'Querida',     sexo: 'FEMALE' as const, data: '2025-09-04', novilha: false },
  // ── Agosto/2025 ───────────────────────────────────────────
  { maeName: 'Esmeralda',   sexo: 'FEMALE' as const, data: '2025-08-30', novilha: false }, // original: "esmeraldaa" → corrigido para Esmeralda
  { maeName: 'Fazenda',     sexo: 'MALE'   as const, data: '2025-08-25', novilha: false },
  { maeName: 'Criola',      sexo: 'MALE'   as const, data: '2025-08-21', novilha: false }, // 1º parto de Criola
  { maeName: 'Jordana',     sexo: 'FEMALE' as const, data: '2025-08-20', novilha: false },
  { maeName: 'Juriti',      sexo: 'FEMALE' as const, data: '2025-08-08', novilha: false },
  { maeName: 'Beterraba',   sexo: 'MALE'   as const, data: '2025-08-03', novilha: false },
  // ── Julho/2025 ────────────────────────────────────────────
  { maeName: 'Rozana',      sexo: 'FEMALE' as const, data: '2025-07-02', novilha: true  }, // não encontrada no banco → será criada como vaca
  { maeName: 'Uberaba',     sexo: 'MALE'   as const, data: '2025-07-02', novilha: false },
]

// ─── Helpers ───────────────────────────────────────────────

function pad(n: number) { return `BOV-${String(n).padStart(4, '0')}` }

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  console.log(`\n${'═'.repeat(60)}`)
  console.log('  REGISTRO DE PARTOS HISTÓRICOS — Jul/2025 a Mai/2026')
  console.log(`  Banco:  ${(process.env.DATABASE_URL ?? 'local').replace(/\/\/[^:]*:[^@]*@/, '//****:****@')}`)
  console.log(`  Modo:   ${EXECUTE ? '🚀 EXECUÇÃO REAL' : '🔍 DRY RUN (preview)'}`)
  console.log('═'.repeat(60) + '\n')

  // ── 1. Carregar todos os animais da fazenda ─────────────
  const allAnimals = await prisma.animal.findMany({
    where:  { farmId: FARM_ID },
    select: { id: true, tag: true, name: true, breed: true, purpose: true, category: true, motherId: true, birthDate: true },
  })

  const tagNums = allAnimals
    .map(a => parseInt(a.tag.replace('BOV-', ''), 10))
    .filter(n => !isNaN(n))
  let nextTag = Math.max(...tagNums) + 1

  // Índice por nome normalizado → animal
  const byName = new Map<string, typeof allAnimals[0]>()
  for (const a of allAnimals) {
    if (a.name) byName.set(normalize(a.name), a)
  }

  // Breed/purpose default
  const defBreed   = allAnimals.find(a => a.breed && a.breed !== 'Mestiço')?.breed ?? 'Girolando'
  const defPurpose = allAnimals.find(a => a.purpose)?.purpose ?? 'DAIRY'

  console.log(`Total de animais na fazenda: ${allAnimals.length}`)
  console.log(`Último brinco: ${pad(nextTag - 1)}  →  próximo: ${pad(nextTag)}`)
  console.log(`Raça padrão: ${defBreed}  |  Finalidade: ${defPurpose}\n`)

  // ── 2. Verificar duplicatas (bezerro já cadastrado com a mesma mãe e data) ──
  const calvesExisting = allAnimals.filter(a => a.category === 'CALF' && a.motherId && a.birthDate)

  // ── 3. Verificar mães encontradas ──────────────────────
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

  // ── 4. Preview ─────────────────────────────────────────
  console.log(`── Vacas (novilhas) a cadastrar (${novilhasACriar.length}):`)
  let previewTag = nextTag
  if (novilhasACriar.length === 0) {
    console.log('   (nenhuma — todas as mães encontradas ou serão sinalizadas)')
  }
  novilhasACriar.forEach(n => {
    console.log(`   ✦ ${pad(previewTag++)} — ${n} (nova vaca)`)
  })

  if (maesNaoEncontradas.length > 0) {
    console.log(`\n⚠️  Mães NÃO ENCONTRADAS no banco (${maesNaoEncontradas.length}):`)
    maesNaoEncontradas.forEach(n => console.log(`   ✗ ${n}`))
    console.log('   → Mude novilha: true para essas mães no script, ou corrija o nome.')
    console.log('   → Em --execute, o bezerro será pulado para mães não encontradas.\n')
  }

  console.log(`\n── Bezerros a criar (${PARTOS.length}):`)
  for (const p of PARTOS) {
    const key  = normalize(p.maeName)
    const mae  = byName.get(key)
    const maeLabel = mae
      ? `${mae.tag} ${p.maeName}`
      : novilhasACriar.includes(p.maeName)
        ? `${p.maeName} (nova)`
        : `??? ${p.maeName} ← MÃE NÃO ENCONTRADA`

    // Verificar duplicata
    const dataObj = new Date(p.data + 'T12:00:00')
    const isDuplicate = mae && calvesExisting.some(c =>
      c.motherId === mae.id &&
      c.birthDate &&
      Math.abs(new Date(c.birthDate).getTime() - dataObj.getTime()) < 3 * 24 * 3600 * 1000,
    )

    const sexLabel = p.sexo === 'MALE' ? 'Macho' : 'Fêmea'
    const dupMark  = isDuplicate ? '  ⚠️  POSSÍVEL DUPLICATA' : ''
    console.log(`   ${pad(previewTag++)} — ${sexLabel} | mãe: ${maeLabel} | ${p.data}${dupMark}`)
  }

  console.log(`\nTotal previsto: ${novilhasACriar.length} vacas + ${PARTOS.length} bezerros`)

  if (!EXECUTE) {
    console.log('\n🛑  DRY RUN — nada foi alterado.')
    console.log('    Revise o output acima e use --execute para aplicar.\n')
    await prisma.$disconnect()
    return
  }

  // ── 5. EXECUÇÃO ────────────────────────────────────────
  console.log('\n🚀 Executando...\n')

  // Criar novilhas não encontradas
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

  // Recarregar byName com as novas mães
  for (const [key, id] of createdMothers) {
    byName.set(key, { id, tag: '—', name: key, breed: defBreed, purpose: defPurpose, category: 'COW', motherId: null, birthDate: null })
  }

  // Criar bezerros
  let criados  = 0
  let pulados  = 0
  let duplicatas = 0

  for (const p of PARTOS) {
    const key    = normalize(p.maeName)
    const mae    = byName.get(key)
    const maeId  = mae?.id

    if (!maeId) {
      console.log(`   ⚠️  Pulando bezerro de ${p.maeName} — mãe não encontrada`)
      pulados++
      continue
    }

    // Verificar duplicata real antes de inserir
    const dataObj = new Date(p.data + 'T12:00:00')
    const dupl = calvesExisting.find(c =>
      c.motherId === maeId &&
      c.birthDate &&
      Math.abs(new Date(c.birthDate).getTime() - dataObj.getTime()) < 3 * 24 * 3600 * 1000,
    )
    if (dupl) {
      console.log(`   ⏭  Pulando bezerro de ${p.maeName} ${p.data} — já existe ${dupl.tag}`)
      duplicatas++
      continue
    }

    const tag      = pad(nextTag++)
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
        birthDate:  dataObj,
        motherId:   maeId,
        fatherId:   null,
      },
    })

    console.log(`   ✓ ${tag} — Bezerro ${sexLabel} | mãe: ${p.maeName} | ${p.data}`)
    criados++
  }

  console.log(`\n✅ Concluído:`)
  console.log(`   ${novilhasACriar.length} vacas criadas`)
  console.log(`   ${criados} bezerros criados`)
  if (pulados)    console.log(`   ${pulados} bezerros pulados (mãe não encontrada)`)
  if (duplicatas) console.log(`   ${duplicatas} bezerros pulados (duplicata detectada)`)
  console.log(`   Brincos: ${pad(nextTag - novilhasACriar.length - criados)} → ${pad(nextTag - 1)}\n`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
