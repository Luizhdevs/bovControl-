import { prisma } from '@/lib/prisma'

// ─── Types ─────────────────────────────────────────────────

export interface TEProtocolHeader {
  id:          string
  name:        string
  status:      'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  opuDate:     Date
  teDate:      Date
  laboratorio: string | null
  touro:       string | null
  doadoras:    string | null
  dgP30Start:  Date | null
  dgP30End:    Date | null
  dgP60Start:  Date | null
  dgP60End:    Date | null
  prevParto:   Date | null
  totalAnimals:  number
  confirmed:     number
  discontinued:  number
  pending:       number
}

export interface TEParticipationEntry {
  participationId: string
  reproductionId:  string | null
  animalId:        string
  tag:             string
  name:            string | null
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
  dgStatus:        'PENDING' | 'CONFIRMED' | 'FAILED' | null
  dgResult:        string | null
  donor:           string | null
  ovaQuality:      string | null
  sexo:            string | null
  discontinuedAt:  Date | null
  discontinuedReason: string | null
}

export interface TEProtocolDetail extends TEProtocolHeader {
  participations: TEParticipationEntry[]
}

// ─── Queries ────────────────────────────────────────────────

export async function getTEProtocolList(farmId: string): Promise<TEProtocolHeader[]> {
  const protocols = await prisma.tEProtocol.findMany({
    where:   { farmId },
    orderBy: { teDate: 'desc' },
    include: {
      participations: {
        select: { status: true },
      },
    },
  })

  return protocols.map((p) => {
    const total        = p.participations.length
    const confirmed    = p.participations.filter((x) => x.status === 'COMPLETED').length
    const discontinued = p.participations.filter((x) => x.status === 'DISCONTINUED').length
    const pending      = p.participations.filter((x) => x.status === 'ACTIVE').length

    return {
      id:          p.id,
      name:        p.name,
      status:      p.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
      opuDate:     p.opuDate,
      teDate:      p.teDate,
      laboratorio: p.laboratorio,
      touro:       p.touro,
      doadoras:    p.doadoras,
      dgP30Start:  p.dgP30Start,
      dgP30End:    p.dgP30End,
      dgP60Start:  p.dgP60Start,
      dgP60End:    p.dgP60End,
      prevParto:   p.prevParto,
      totalAnimals: total,
      confirmed,
      discontinued,
      pending,
    }
  })
}

export async function getTEProtocolDetail(
  protocolId: string,
  farmId:     string,
): Promise<TEProtocolDetail | null> {
  const protocol = await prisma.tEProtocol.findFirst({
    where: { id: protocolId, farmId },
    include: {
      participations: {
        include: {
          animal:       { select: { id: true, tag: true, name: true } },
          reproduction: { select: { id: true, status: true, result: true } },
        },
        orderBy: { animal: { tag: 'asc' } },
      },
    },
  })

  if (!protocol) return null

  const participations: TEParticipationEntry[] = protocol.participations.map((p) => ({
    participationId:     p.id,
    reproductionId:      p.reproductionId,
    animalId:            p.animal.id,
    tag:                 p.animal.tag,
    name:                p.animal.name,
    participationStatus: p.status as 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED',
    dgStatus:            p.reproduction?.status as 'PENDING' | 'CONFIRMED' | 'FAILED' | null ?? null,
    dgResult:            p.reproduction?.result ?? null,
    donor:               p.donor,
    ovaQuality:          p.ovaQuality,
    sexo:                p.sexo,
    discontinuedAt:      p.discontinuedAt,
    discontinuedReason:  p.discontinuedReason,
  }))

  const total        = participations.length
  const confirmed    = participations.filter((x) => x.participationStatus === 'COMPLETED').length
  const discontinued = participations.filter((x) => x.participationStatus === 'DISCONTINUED').length
  const pending      = participations.filter((x) => x.participationStatus === 'ACTIVE').length

  return {
    id:          protocol.id,
    name:        protocol.name,
    status:      protocol.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
    opuDate:     protocol.opuDate,
    teDate:      protocol.teDate,
    laboratorio: protocol.laboratorio,
    touro:       protocol.touro,
    doadoras:    protocol.doadoras,
    dgP30Start:  protocol.dgP30Start,
    dgP30End:    protocol.dgP30End,
    dgP60Start:  protocol.dgP60Start,
    dgP60End:    protocol.dgP60End,
    prevParto:   protocol.prevParto,
    totalAnimals: total,
    confirmed,
    discontinued,
    pending,
    participations,
  }
}

// Animais elegíveis: fêmeas ativas sem participação ACTIVE em outro protocolo
export async function getAnimalsEligibleForTE(farmId: string): Promise<
  { id: string; tag: string; name: string | null; category: string }[]
> {
  // IDs de animais já em protocolo ativo
  const activeParticipations = await prisma.tEParticipation.findMany({
    where: {
      status:   'ACTIVE',
      protocol: { farmId },
    },
    select: { animalId: true },
  })
  const busyIds = new Set(activeParticipations.map((p) => p.animalId))

  const animals = await prisma.animal.findMany({
    where: {
      farmId,
      status:   'ACTIVE',
      sex:      'FEMALE',
      category: { in: ['HEIFER', 'COW'] },
    },
    select: { id: true, tag: true, name: true, category: true },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take: 500,
  })

  return animals.map((a) => ({
    ...a,
    category: a.category,
    busy: busyIds.has(a.id),
  })).filter((a) => !a.busy).map(({ busy: _busy, ...a }) => a)
}
