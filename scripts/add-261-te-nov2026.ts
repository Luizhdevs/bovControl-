/**
 * Adiciona BOV-0261 ao protocolo TE Out-Nov/2026 — Eleva Embriões
 * Protocolo ID: cmvz2i1de0002bainu1mq9o1v
 */

import { prisma } from '../src/lib/prisma'

const FARM_ID     = 'farm_saldanha'
const PROTOCOL_ID = 'cmvz2i1de0002bainu1mq9o1v'
const TAG         = 'BOV-0261'

async function main() {
  // 1. Buscar animal
  const animal = await prisma.animal.findFirst({
    where: { farmId: FARM_ID, tag: TAG, status: 'ACTIVE', sex: 'FEMALE' },
    select: { id: true, tag: true, name: true, category: true },
  })
  if (!animal) {
    console.error(`❌ Animal ${TAG} não encontrado ou não elegível (inativo / macho)`)
    process.exit(1)
  }
  console.log(`✓ Animal: ${animal.tag} — ${animal.name ?? '—'} (${animal.category})`)

  // 2. Verificar protocolo
  const protocol = await prisma.tEProtocol.findFirst({
    where: { id: PROTOCOL_ID, farmId: FARM_ID },
    select: { id: true, name: true, teDate: true, dgP30Start: true, touro: true },
  })
  if (!protocol) {
    console.error('❌ Protocolo não encontrado')
    process.exit(1)
  }
  console.log(`✓ Protocolo: ${protocol.name}`)

  // 3. Verificar conflito
  const conflict = await prisma.tEParticipation.findFirst({
    where: { animalId: animal.id, status: 'ACTIVE', protocol: { farmId: FARM_ID } },
    include: { protocol: { select: { name: true } } },
  })
  if (conflict) {
    console.error(`❌ ${TAG} já está ativo em: ${conflict.protocol.name}`)
    process.exit(1)
  }

  // 4. Verificar se já está neste protocolo
  const existing = await prisma.tEParticipation.findFirst({
    where: { protocolId: PROTOCOL_ID, animalId: animal.id },
  })
  if (existing) {
    console.error(`❌ ${TAG} já está neste protocolo (status: ${existing.status})`)
    process.exit(1)
  }

  // 5. Criar Reproduction + TEParticipation
  await prisma.$transaction(async (tx) => {
    const repro = await tx.reproduction.create({
      data: {
        animalId:      animal.id,
        type:          'INSEMINATION',
        status:        'PENDING',
        date:          protocol.teDate,
        bullName:      protocol.touro ? `TE: ${protocol.touro}` : 'TE: (a definir após OPU)',
        nextCheckDate: protocol.dgP30Start ?? null,
        notes: JSON.stringify({
          tipo:        'TE',
          protocolId:  PROTOCOL_ID,
          teDate:      protocol.teDate.toISOString().slice(0, 10),
          laboratorio: 'Eleva Embriões Ltda',
          origemPDF:   'PROTOCOLO FAZ SALDANHA LUIS PERDIGÃO 27.10.pdf',
          obs:         'Adicionado manualmente — 17ª receptora',
        }),
      },
      select: { id: true },
    })

    await tx.tEParticipation.create({
      data: {
        protocolId:     PROTOCOL_ID,
        animalId:       animal.id,
        reproductionId: repro.id,
        status:         'ACTIVE',
      },
    })
  })

  // 6. Verificar total
  const total = await prisma.tEParticipation.count({ where: { protocolId: PROTOCOL_ID } })
  console.log(`\n✅ BOV-0261 adicionada ao protocolo!`)
  console.log(`   Total de receptoras agora: ${total}`)

  await prisma.$disconnect()
}
main().catch(e => { console.error(e); process.exit(1) })
