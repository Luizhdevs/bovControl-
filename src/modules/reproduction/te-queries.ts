import { prisma } from '@/lib/prisma'

// ─── Types ─────────────────────────────────────────────────

/**
 * Etapa atual de cada receptora no protocolo TETF.
 * Fluxo: PENDING_WITHDRAWAL → PENDING_TE → WAITING_P30 → WAITING_P60 → PRENHA
 *        (qualquer etapa pode ir para DISCONTINUED ou TE_NO_RESPONSE)
 */
export type TECurrentStage =
  | 'PENDING_WITHDRAWAL'  // implante inserido, aguardando Dia 8 (retirada + hormônios)
  | 'PENDING_TE'          // hormônios aplicados, aguardando TE
  | 'TE_NO_RESPONSE'      // animal não respondeu ao TE — aguarda decisão
  | 'WAITING_P30'         // TE realizada, aguardando DG P30
  | 'WAITING_P60'         // DG P30 confirmado, aguardando sexagem/DG P60
  | 'PRENHA'              // DG P60 confirmado (com sexagem)
  | 'DISCONTINUED'        // retirada do protocolo em qualquer etapa

export interface TEProtocolHeader {
  id:          string
  name:        string
  status:      'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  startDate:      Date | null
  withdrawalDate: Date | null
  opuDate:     Date | null
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
  category:        string
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
  dgStatus:        'PENDING' | 'CONFIRMED' | 'FAILED' | null
  dgResult:        string | null
  donor:           string | null
  ovaQuality:      string | null
  sexo:            string | null
  // Novas colunas
  withdrawalDone:  boolean
  teResponse:      string | null  // 'RESPONDED' | 'NOT_RESPONDED'
  sexagemResult:   string | null  // 'FEMALE' | 'MALE' | 'ABSORBED'
  discontinuedAt:  Date | null
  discontinuedReason: string | null
  currentDGStage:  TECurrentStage
}

export interface TEProtocolDetail extends TEProtocolHeader {
  participations: TEParticipationEntry[]
}

// ─── Queries ────────────────────────────────────────────────

export async function getTEProtocolList(farmId: string): Promise<TEProtocolHeader[]> {
  const protocols = await prisma.tEProtocol.findMany({
    where:   { farmId },
    orderBy: { teDate: 'desc' },
    include: { participations: { select: { status: true } } },
  })

  return protocols.map((p) => {
    const total        = p.participations.length
    const confirmed    = p.participations.filter((x) => x.status === 'COMPLETED').length
    const discontinued = p.participations.filter((x) => x.status === 'DISCONTINUED').length
    const pending      = p.participations.filter((x) => x.status === 'ACTIVE').length

    return {
      id:             p.id,
      name:           p.name,
      status:         p.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
      startDate:      p.startDate,
      withdrawalDate: p.withdrawalDate,
      opuDate:        p.opuDate,
      teDate:         p.teDate,
      laboratorio:    p.laboratorio,
      touro:          p.touro,
      doadoras:       p.doadoras,
      dgP30Start:     p.dgP30Start,
      dgP30End:       p.dgP30End,
      dgP60Start:     p.dgP60Start,
      dgP60End:       p.dgP60End,
      prevParto:      p.prevParto,
      totalAnimals:   total,
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
          animal:       { select: { id: true, tag: true, name: true, category: true } },
          reproduction: { select: { id: true, status: true, result: true } },
        },
        orderBy: { animal: { tag: 'asc' } },
      },
    },
  })

  if (!protocol) return null

  const participations: TEParticipationEntry[] = protocol.participations.map((p) => {
    const partStatus = p.status as 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
    const dgStatus   = (p.reproduction?.status ?? null) as 'PENDING' | 'CONFIRMED' | 'FAILED' | null

    // Cálculo da etapa atual
    const currentDGStage: TECurrentStage =
      partStatus === 'DISCONTINUED'           ? 'DISCONTINUED' :
      partStatus === 'COMPLETED'              ? 'PRENHA' :
      p.teResponse === 'NOT_RESPONDED'        ? 'TE_NO_RESPONSE' :
      dgStatus    === 'CONFIRMED'             ? 'WAITING_P60' :
      p.teResponse === 'RESPONDED'            ? 'WAITING_P30' :
      p.withdrawalDone                        ? 'PENDING_TE' :
                                               'PENDING_WITHDRAWAL'

    return {
      participationId:     p.id,
      reproductionId:      p.reproductionId,
      animalId:            p.animal.id,
      tag:                 p.animal.tag,
      name:                p.animal.name,
      category:            p.animal.category,
      participationStatus: partStatus,
      dgStatus,
      dgResult:            p.reproduction?.result ?? null,
      donor:               p.donor,
      ovaQuality:          p.ovaQuality,
      sexo:                p.sexo,
      withdrawalDone:      p.withdrawalDone,
      teResponse:          p.teResponse,
      sexagemResult:       p.sexagemResult,
      discontinuedAt:      p.discontinuedAt,
      discontinuedReason:  p.discontinuedReason,
      currentDGStage,
    }
  })

  const total        = participations.length
  const confirmed    = participations.filter((x) => x.participationStatus === 'COMPLETED').length
  const discontinued = participations.filter((x) => x.participationStatus === 'DISCONTINUED').length
  const pending      = participations.filter((x) => x.participationStatus === 'ACTIVE').length

  return {
    id:             protocol.id,
    name:           protocol.name,
    status:         protocol.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
    startDate:      protocol.startDate,
    withdrawalDate: protocol.withdrawalDate,
    opuDate:        protocol.opuDate,
    teDate:         protocol.teDate,
    laboratorio:    protocol.laboratorio,
    touro:          protocol.touro,
    doadoras:       protocol.doadoras,
    dgP30Start:     protocol.dgP30Start,
    dgP30End:       protocol.dgP30End,
    dgP60Start:     protocol.dgP60Start,
    dgP60End:       protocol.dgP60End,
    prevParto:      protocol.prevParto,
    totalAnimals:   total,
    confirmed,
    discontinued,
    pending,
    participations,
  }
}

// ─── Participações TE de um animal ─────────────────────────

export interface AnimalTEParticipation {
  participationId: string
  protocolId:      string
  protocolName:    string
  teDate:          Date
  prevParto:       Date | null
  touro:           string | null
  laboratorio:     string | null
  currentDGStage:  TECurrentStage
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
  donor:           string | null
  ovaQuality:      string | null
  sexo:            string | null
  sexagemResult:   string | null
}

export async function getAnimalTEParticipations(
  animalId: string,
  farmId:   string,
): Promise<AnimalTEParticipation[]> {
  const participations = await prisma.tEParticipation.findMany({
    where: {
      animalId,
      protocol: { farmId },
    },
    include: {
      protocol:     { select: { id: true, name: true, teDate: true, prevParto: true, touro: true, laboratorio: true } },
      reproduction: { select: { status: true } },
    },
    orderBy: { protocol: { teDate: 'desc' } },
  })

  return participations.map((p) => {
    const partStatus = p.status as 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
    const dgStatus   = (p.reproduction?.status ?? null) as 'PENDING' | 'CONFIRMED' | 'FAILED' | null

    const currentDGStage: TECurrentStage =
      partStatus === 'DISCONTINUED'           ? 'DISCONTINUED' :
      partStatus === 'COMPLETED'              ? 'PRENHA' :
      p.teResponse === 'NOT_RESPONDED'        ? 'TE_NO_RESPONSE' :
      dgStatus    === 'CONFIRMED'             ? 'WAITING_P60' :
      p.teResponse === 'RESPONDED'            ? 'WAITING_P30' :
      p.withdrawalDone                        ? 'PENDING_TE' :
                                               'PENDING_WITHDRAWAL'

    return {
      participationId:     p.id,
      protocolId:          p.protocol.id,
      protocolName:        p.protocol.name,
      teDate:              p.protocol.teDate,
      prevParto:           p.protocol.prevParto,
      touro:               p.protocol.touro,
      laboratorio:         p.protocol.laboratorio,
      currentDGStage,
      participationStatus: partStatus,
      donor:               p.donor,
      ovaQuality:          p.ovaQuality,
      sexo:                p.sexo,
      sexagemResult:       p.sexagemResult,
    }
  })
}

// Animais elegíveis: fêmeas ativas sem participação ACTIVE em outro protocolo
export async function getAnimalsEligibleForTE(farmId: string): Promise<
  { id: string; tag: string; name: string | null; category: string }[]
> {
  const activeParticipations = await prisma.tEParticipation.findMany({
    where: { status: 'ACTIVE', protocol: { farmId } },
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
    select:  { id: true, tag: true, name: true, category: true },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take:    500,
  })

  return animals
    .filter((a) => !busyIds.has(a.id))
    .map(({ ...a }) => a)
}
