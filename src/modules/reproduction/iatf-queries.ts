import { prisma } from '@/lib/prisma'

// ─── Types ─────────────────────────────────────────────────

/**
 * Etapa atual de cada animal no protocolo IATF.
 * Fluxo: PENDING_D8 → PENDING_IA → WAITING_DG → PRENHA
 *        (qualquer etapa pode ir para VAZIA ou DISCONTINUED)
 */
export type IATFCurrentStage =
  | 'PENDING_D8'    // aguardando D8 — hormônios de cio
  | 'PENDING_IA'    // D8 feito, aguardando IA no D10
  | 'WAITING_DG'    // IA feita, aguardando diagnóstico de gestação
  | 'PRENHA'        // DG confirmado — participation COMPLETED
  | 'VAZIA'         // DG negativo — participation DISCONTINUED, reason 'DG negativo...'
  | 'ABORTED'       // aborto após prenhez confirmada — DISCONTINUED, reason 'Aborto...'
  | 'DISCONTINUED'  // retirada por outro motivo

export interface IATFProtocolHeader {
  id:        string
  name:      string
  status:    'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  d0Date:    Date
  d8Date:    Date | null
  d10Date:   Date
  touro:     string | null
  dgStart:   Date | null
  dgEnd:     Date | null
  prevParto: Date | null
  totalAnimals: number
  confirmed:    number   // PRENHA (ativas, sem aborto)
  aborted:      number   // aborto após prenhez confirmada
  vacias:       number   // VAZIA
  discontinued: number   // dropped for other reason
  pending:      number   // ACTIVE (not yet PRENHA/VAZIA/DISCONTINUED)
}

export interface IATFParticipationEntry {
  participationId:    string
  reproductionId:     string | null
  animalId:           string
  tag:                string
  name:               string | null
  category:           string
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
  touro:              string | null  // animal-level override
  d8Done:             boolean
  iaDone:             boolean
  dgStatus:           'PENDING' | 'CONFIRMED' | 'FAILED' | null
  discontinuedAt:     Date | null
  discontinuedReason: string | null
  currentStage:       IATFCurrentStage
}

export interface IATFProtocolDetail extends IATFProtocolHeader {
  participations: IATFParticipationEntry[]
}

// ─── Stage helper ───────────────────────────────────────────

function computeStage(
  partStatus:         string,
  discontinuedReason: string | null,
  d8Done:             boolean,
  iaDone:             boolean,
  dgStatus:           string | null,
): IATFCurrentStage {
  if (partStatus === 'COMPLETED')   return 'PRENHA'
  if (partStatus === 'DISCONTINUED') {
    if (discontinuedReason?.startsWith('DG negativo')) return 'VAZIA'
    if (discontinuedReason?.startsWith('Aborto'))      return 'ABORTED'
    return 'DISCONTINUED'
  }
  // ACTIVE
  if (!d8Done) return 'PENDING_D8'
  if (!iaDone) return 'PENDING_IA'
  return 'WAITING_DG'
}

// ─── Queries ────────────────────────────────────────────────

export async function getIATFProtocolList(farmId: string): Promise<IATFProtocolHeader[]> {
  const protocols = await prisma.iATFProtocol.findMany({
    where:   { farmId },
    orderBy: { d10Date: 'desc' },
    include: { participations: { select: { status: true, discontinuedReason: true } } },
  })

  return protocols.map((p) => {
    const total        = p.participations.length
    const confirmed    = p.participations.filter((x) => x.status === 'COMPLETED').length
    const aborted      = p.participations.filter((x) =>
      x.status === 'DISCONTINUED' && x.discontinuedReason?.startsWith('Aborto'),
    ).length
    const vacias       = p.participations.filter((x) =>
      x.status === 'DISCONTINUED' && x.discontinuedReason?.startsWith('DG negativo'),
    ).length
    const discontinued = p.participations.filter((x) =>
      x.status === 'DISCONTINUED' &&
      !x.discontinuedReason?.startsWith('DG negativo') &&
      !x.discontinuedReason?.startsWith('Aborto'),
    ).length
    const pending      = p.participations.filter((x) => x.status === 'ACTIVE').length

    return {
      id:        p.id,
      name:      p.name,
      status:    p.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
      d0Date:    p.d0Date,
      d8Date:    p.d8Date,
      d10Date:   p.d10Date,
      touro:     p.touro,
      dgStart:   p.dgStart,
      dgEnd:     p.dgEnd,
      prevParto: p.prevParto,
      totalAnimals: total,
      confirmed,
      aborted,
      vacias,
      discontinued,
      pending,
    }
  })
}

export async function getIATFProtocolDetail(
  protocolId: string,
  farmId:     string,
): Promise<IATFProtocolDetail | null> {
  const protocol = await prisma.iATFProtocol.findFirst({
    where: { id: protocolId, farmId },
    include: {
      participations: {
        include: {
          animal:       { select: { id: true, tag: true, name: true, category: true } },
          reproduction: { select: { id: true, status: true } },
        },
        orderBy: { animal: { tag: 'asc' } },
      },
    },
  })

  if (!protocol) return null

  const participations: IATFParticipationEntry[] = protocol.participations.map((p) => {
    const partStatus = p.status as 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
    const dgStatus   = (p.reproduction?.status ?? null) as 'PENDING' | 'CONFIRMED' | 'FAILED' | null

    return {
      participationId:    p.id,
      reproductionId:     p.reproductionId,
      animalId:           p.animal.id,
      tag:                p.animal.tag,
      name:               p.animal.name,
      category:           p.animal.category,
      participationStatus: partStatus,
      touro:              p.touro,
      d8Done:             p.d8Done,
      iaDone:             p.iaDone,
      dgStatus,
      discontinuedAt:     p.discontinuedAt,
      discontinuedReason: p.discontinuedReason,
      currentStage:       computeStage(partStatus, p.discontinuedReason, p.d8Done, p.iaDone, dgStatus),
    }
  })

  const total        = participations.length
  const confirmed    = participations.filter((x) => x.participationStatus === 'COMPLETED').length
  const aborted      = participations.filter((x) =>
    x.participationStatus === 'DISCONTINUED' && x.discontinuedReason?.startsWith('Aborto'),
  ).length
  const vacias       = participations.filter((x) =>
    x.participationStatus === 'DISCONTINUED' && x.discontinuedReason?.startsWith('DG negativo'),
  ).length
  const discontinued = participations.filter((x) =>
    x.participationStatus === 'DISCONTINUED' &&
    !x.discontinuedReason?.startsWith('DG negativo') &&
    !x.discontinuedReason?.startsWith('Aborto'),
  ).length
  const pending      = participations.filter((x) => x.participationStatus === 'ACTIVE').length

  return {
    id:        protocol.id,
    name:      protocol.name,
    status:    protocol.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
    d0Date:    protocol.d0Date,
    d8Date:    protocol.d8Date,
    d10Date:   protocol.d10Date,
    touro:     protocol.touro,
    dgStart:   protocol.dgStart,
    dgEnd:     protocol.dgEnd,
    prevParto: protocol.prevParto,
    totalAnimals: total,
    confirmed,
    aborted,
    vacias,
    discontinued,
    pending,
    participations,
  }
}

// ─── Animais elegíveis para IATF ───────────────────────────
// Fêmeas ativas sem participação ACTIVE em outro protocolo IATF
// (podem estar em TE simultaneamente — são protocolos distintos)

export async function getAnimalsEligibleForIATF(farmId: string): Promise<
  { id: string; tag: string; name: string | null; category: string }[]
> {
  const activeParticipations = await prisma.iATFParticipation.findMany({
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

  return animals.filter((a) => !busyIds.has(a.id))
}

// ─── Participações IATF de um animal ───────────────────────

export interface AnimalIATFParticipation {
  participationId:    string
  protocolId:         string
  protocolName:       string
  d10Date:            Date
  prevParto:          Date | null
  touro:              string | null
  currentStage:       IATFCurrentStage
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
}

export async function getAnimalIATFParticipations(
  animalId: string,
  farmId:   string,
): Promise<AnimalIATFParticipation[]> {
  const participations = await prisma.iATFParticipation.findMany({
    where: {
      animalId,
      protocol: { farmId },
    },
    include: {
      protocol:     { select: { id: true, name: true, d10Date: true, prevParto: true, touro: true } },
      reproduction: { select: { status: true } },
    },
    orderBy: { protocol: { d10Date: 'desc' } },
  })

  return participations.map((p) => {
    const partStatus = p.status as 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
    const dgStatus   = (p.reproduction?.status ?? null) as string | null

    return {
      participationId:    p.id,
      protocolId:         p.protocol.id,
      protocolName:       p.protocol.name,
      d10Date:            p.protocol.d10Date,
      prevParto:          p.protocol.prevParto,
      touro:              p.touro ?? p.protocol.touro,
      currentStage:       computeStage(partStatus, p.discontinuedReason, p.d8Done, p.iaDone, dgStatus),
      participationStatus: partStatus,
    }
  })
}
