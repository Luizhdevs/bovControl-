/**
 * Importa protocolo TETF Out-Nov/2026 — Eleva Embriões
 * PDF: PROTOCOLO FAZ SALDANHA LUIS PERDIGÃO 27.10.pdf
 *
 * Início: 27/10/2026 | Retirada: 04/11/2026 | OPU: 05/11/2026 | TE: 13/11/2026
 * Receptoras: 0172, 184, 185, 187, 191, 192, 193, 195, 197, 198,
 *             199, 206, 211, 247, 249, 260
 */

import { prisma } from '../src/lib/prisma'
import { addDays } from 'date-fns'

const FARM_ID = 'farm_saldanha'

// Tags do PDF → formato BOV-XXXX
const RAW_TAGS = [
  '0172', '184', '185', '187', '191', '192', '193', '195',
  '197',  '198', '199', '206', '211', '247', '249', '260',
]

function toTag(raw: string): string {
  const n = raw.replace(/\D/g, '').padStart(4, '0')
  return `BOV-${n}`
}

const PROTOCOL_TAGS = RAW_TAGS.map(toTag)

const TE_DATE   = new Date('2026-11-13')
const OPU_DATE  = new Date('2026-11-05')

// Janelas DG baseadas no padrão Eleva (mesma proporção do TE Set/2026)
// DG P30: TE + 22d a TE + 32d
// DG P60: TE + 52d a TE + 62d
// Prev. parto: TE + 270d (~9 meses bovino)
const DG_P30_START = addDays(TE_DATE, 22)   // 05/12/2026
const DG_P30_END   = addDays(TE_DATE, 32)   // 15/12/2026
const DG_P60_START = addDays(TE_DATE, 52)   // 04/01/2027
const DG_P60_END   = addDays(TE_DATE, 62)   // 14/01/2027
const PREV_PARTO   = addDays(TE_DATE, 270)  // 11/08/2027

async function main() {
  console.log('=== Protocolo TETF Out-Nov/2026 ===\n')
  console.log('Tags esperadas:', PROTOCOL_TAGS.join(', '))
  console.log()

  // 1. Buscar animais
  const animals = await prisma.animal.findMany({
    where: {
      farmId: FARM_ID,
      tag:    { in: PROTOCOL_TAGS },
      status: 'ACTIVE',
      sex:    'FEMALE',
    },
    select: { id: true, tag: true, name: true, category: true, status: true },
    orderBy: { tag: 'asc' },
  })

  const foundTags = new Set(animals.map(a => a.tag))
  const missing   = PROTOCOL_TAGS.filter(t => !foundTags.has(t))

  console.log(`Encontradas: ${animals.length}/16 receptoras`)
  if (missing.length > 0) {
    console.log('⚠ NÃO ENCONTRADAS (inativas, vendidas ou tag diferente):')
    missing.forEach(t => console.log('  -', t))

    // Tentar localizar com busca ampla
    const alts = await prisma.animal.findMany({
      where: { farmId: FARM_ID, tag: { in: missing } },
      select: { tag: true, status: true, category: true },
    })
    if (alts.length > 0) {
      console.log('  (encontradas mas em status diferente de ACTIVE/FEMALE):')
      alts.forEach(a => console.log(`    ${a.tag} — ${a.status} / ${a.category}`))
    }
  }

  console.log('\nAnimais encontrados:')
  animals.forEach(a => console.log(`  ${a.tag.padEnd(10)} ${(a.name ?? '—').padEnd(20)} ${a.category} / ${a.status}`))

  if (animals.length === 0) {
    console.error('\n❌ Nenhum animal encontrado — abortando.')
    process.exit(1)
  }

  // 2. Verificar conflito de protocolo ativo
  const conflicts = await prisma.tEParticipation.findMany({
    where: {
      animalId: { in: animals.map(a => a.id) },
      status:   'ACTIVE',
      protocol: { farmId: FARM_ID },
    },
    include: { animal: { select: { tag: true } }, protocol: { select: { name: true } } },
  })

  if (conflicts.length > 0) {
    console.log('\n⚠ Animais já em protocolo ativo:')
    conflicts.forEach(c => console.log(`  ${c.animal.tag} — ${c.protocol.name}`))
    console.log('  Esses serão excluídos do novo protocolo para não criar conflito.')
  }

  const conflictIds = new Set(conflicts.map(c => c.animalId))
  const eligible    = animals.filter(a => !conflictIds.has(a.id))

  console.log(`\nElegíveis para o novo protocolo: ${eligible.length}`)

  if (eligible.length === 0) {
    console.error('❌ Nenhum animal elegível — abortando.')
    process.exit(1)
  }

  // 3. Verificar se protocolo já existe
  const existing = await prisma.tEProtocol.findFirst({
    where: { farmId: FARM_ID, name: { contains: 'Out-Nov/2026' } },
  })
  if (existing) {
    console.error('\n❌ Protocolo Out-Nov/2026 já existe:', existing.id, '— abortando (sem duplicata).')
    process.exit(1)
  }

  // 4. Criar protocolo
  console.log('\nCriando protocolo...')
  console.log('  OPU:', OPU_DATE.toLocaleDateString('pt-BR'))
  console.log('  TE: ', TE_DATE.toLocaleDateString('pt-BR'))
  console.log('  DG P30:', DG_P30_START.toLocaleDateString('pt-BR'), '–', DG_P30_END.toLocaleDateString('pt-BR'))
  console.log('  DG P60:', DG_P60_START.toLocaleDateString('pt-BR'), '–', DG_P60_END.toLocaleDateString('pt-BR'))
  console.log('  Prev. parto:', PREV_PARTO.toLocaleDateString('pt-BR'))

  const protocol = await prisma.$transaction(async (tx) => {
    const proto = await tx.tEProtocol.create({
      data: {
        farmId:      FARM_ID,
        name:        'TE Out-Nov/2026 — Eleva Embriões',
        opuDate:     OPU_DATE,
        teDate:      TE_DATE,
        laboratorio: 'Eleva Embriões Ltda',
        touro:       null,     // não consta no PDF — atualizar após OPU
        doadoras:    null,     // não consta no PDF — atualizar após OPU
        dgP30Start:  DG_P30_START,
        dgP30End:    DG_P30_END,
        dgP60Start:  DG_P60_START,
        dgP60End:    DG_P60_END,
        prevParto:   PREV_PARTO,
      },
      select: { id: true },
    })

    for (const animal of eligible) {
      const repro = await tx.reproduction.create({
        data: {
          animalId:      animal.id,
          type:          'INSEMINATION',
          status:        'PENDING',
          date:          TE_DATE,
          bullName:      'TE: (a definir após OPU)',
          nextCheckDate: DG_P30_START,
          notes: JSON.stringify({
            tipo:        'TE',
            protocolId:  proto.id,
            teDate:      TE_DATE.toISOString().slice(0, 10),
            opuDate:     OPU_DATE.toISOString().slice(0, 10),
            laboratorio: 'Eleva Embriões Ltda',
            origemPDF:   'PROTOCOLO FAZ SALDANHA LUIS PERDIGÃO 27.10.pdf',
            inicioProtocolo: '2026-10-27',
            retirada:    '2026-11-04',
          }),
        },
        select: { id: true },
      })

      await tx.tEParticipation.create({
        data: {
          protocolId:     proto.id,
          animalId:       animal.id,
          reproductionId: repro.id,
          status:         'ACTIVE',
        },
      })
    }

    return proto
  })

  console.log('\n✅ Protocolo criado:', protocol.id)
  console.log(`   ${eligible.length} receptoras registradas`)

  if (missing.length > 0 || conflictIds.size > 0) {
    console.log('\n⚠ Atenção:')
    if (missing.length > 0) console.log(`  ${missing.length} tag(s) não encontradas — verificar manualmente:`, missing.join(', '))
    if (conflictIds.size > 0) console.log(`  ${conflictIds.size} animal(is) pulados por conflito de protocolo ativo`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
