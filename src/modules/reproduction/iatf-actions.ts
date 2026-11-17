'use server'

import { revalidatePath }    from 'next/cache'
import { addDays }           from 'date-fns'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { getActiveFarm }     from '@/lib/active-farm'
import { requireFarmAccess } from '@/lib/permissions'
import { auditCreate, auditUpdate } from '@/lib/audit'
import type { ActionResult } from './types'

// ─── Helper ────────────────────────────────────────────────

async function getSessionFarm() {
  const session = await auth()
  if (!session) return null
  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return null
  return { userId: session.user.id, farmId: activeFarm.farmId }
}

// ─── Criar protocolo IATF ──────────────────────────────────

interface CreateIATFProtocolInput {
  name:      string
  d0Date:    string
  d8Date?:   string
  d10Date:   string
  touro?:    string
  dgStart?:  string
  dgEnd?:    string
  prevParto?: string
  animals: {
    animalId: string
    touro?:   string   // override de sêmen por animal
  }[]
}

export async function createIATFProtocol(
  input: CreateIATFProtocolInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    if (!input.name.trim())         return { success: false, error: 'Nome do protocolo obrigatório' }
    if (input.animals.length === 0) return { success: false, error: 'Selecione pelo menos um animal' }

    const animalIds = input.animals.map((a) => a.animalId)

    // Validar que todos os animais pertencem à fazenda e são fêmeas ativas
    const dbAnimals = await prisma.animal.findMany({
      where: { id: { in: animalIds }, farmId, status: 'ACTIVE', sex: 'FEMALE' },
      select: { id: true, tag: true },
    })
    if (dbAnimals.length !== animalIds.length) {
      return { success: false, error: 'Um ou mais animais inválidos' }
    }

    // Verificar que nenhum animal está ativo em outro protocolo IATF
    const conflicting = await prisma.iATFParticipation.findFirst({
      where: {
        animalId: { in: animalIds },
        status:   'ACTIVE',
        protocol: { farmId },
      },
      include: { animal: { select: { tag: true } } },
    })
    if (conflicting) {
      return {
        success: false,
        error:   `${conflicting.animal.tag} já está ativo em outro protocolo IATF`,
      }
    }

    const d10Date = new Date(input.d10Date)
    // parto previsto padrão: IA + 280 dias
    const defaultPrevParto = addDays(d10Date, 280)

    const protocol = await prisma.$transaction(async (tx) => {
      const proto = await tx.iATFProtocol.create({
        data: {
          farmId,
          name:      input.name.trim(),
          d0Date:    new Date(input.d0Date),
          d8Date:    input.d8Date    ? new Date(input.d8Date)    : null,
          d10Date,
          touro:     input.touro     || null,
          dgStart:   input.dgStart   ? new Date(input.dgStart)   : null,
          dgEnd:     input.dgEnd     ? new Date(input.dgEnd)     : null,
          prevParto: input.prevParto ? new Date(input.prevParto) : defaultPrevParto,
        },
        select: { id: true },
      })

      for (const a of input.animals) {
        const touroFinal = a.touro || input.touro || null

        const repro = await tx.reproduction.create({
          data: {
            animalId: a.animalId,
            type:     'INSEMINATION',
            status:   'PENDING',
            date:     d10Date,
            bullName: touroFinal,
            nextCheckDate: input.dgStart ? new Date(input.dgStart) : addDays(d10Date, 30),
            notes: JSON.stringify({
              tipo:       'IATF',
              protocolId: proto.id,
              d0Date:     input.d0Date,
              d10Date:    input.d10Date,
              touro:      touroFinal,
            }),
          },
          select: { id: true },
        })

        await tx.iATFParticipation.create({
          data: {
            protocolId:    proto.id,
            animalId:      a.animalId,
            reproductionId: repro.id,
            touro:          a.touro || null,
          },
        })
      }

      return proto
    })

    auditCreate({
      farmId,
      userId,
      entity:   'IATFProtocol',
      entityId: protocol.id,
      after:    { name: input.name, d10Date: input.d10Date, animals: animalIds.length },
      metadata: { source: 'web' },
    })

    revalidatePath('/reproduction/protocolos/iatf')
    revalidatePath('/reproduction')
    return { success: true, data: { id: protocol.id } }
  } catch (error) {
    console.error('[createIATFProtocol]', error)
    return { success: false, error: 'Erro ao criar protocolo. Tente novamente.' }
  }
}

// ─── Registrar D8 (hormônios de cio) ──────────────────────

export async function recordIATFD8(
  participationId: string,
): Promise<ActionResult<void>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    const participation = await prisma.iATFParticipation.findFirst({
      where: { id: participationId, status: 'ACTIVE', protocol: { farmId } },
      select: { id: true, animalId: true, d8Done: true },
    })
    if (!participation)      return { success: false, error: 'Participação não encontrada' }
    if (participation.d8Done) return { success: false, error: 'D8 já registrado' }

    await prisma.iATFParticipation.update({
      where: { id: participationId },
      data:  { d8Done: true },
    })

    auditUpdate({
      farmId, userId,
      entity:   'IATFParticipation',
      entityId: participationId,
      before:   { d8Done: false },
      after:    { d8Done: true },
      metadata: { source: 'web', event: 'IATF_D8_DONE' },
    })

    revalidatePath('/reproduction/protocolos/iatf')
    revalidatePath(`/reproduction/${participation.animalId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[recordIATFD8]', error)
    return { success: false, error: 'Erro ao registrar D8. Tente novamente.' }
  }
}

// ─── Registrar IA (D10) ────────────────────────────────────

export async function recordIATFIA(
  participationId: string,
): Promise<ActionResult<void>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    const participation = await prisma.iATFParticipation.findFirst({
      where: { id: participationId, status: 'ACTIVE', protocol: { farmId } },
      select: { id: true, animalId: true, d8Done: true, iaDone: true },
    })
    if (!participation)        return { success: false, error: 'Participação não encontrada' }
    if (!participation.d8Done) return { success: false, error: 'Registre o D8 primeiro' }
    if (participation.iaDone)  return { success: false, error: 'IA já registrada' }

    await prisma.iATFParticipation.update({
      where: { id: participationId },
      data:  { iaDone: true },
    })

    auditUpdate({
      farmId, userId,
      entity:   'IATFParticipation',
      entityId: participationId,
      before:   { iaDone: false },
      after:    { iaDone: true },
      metadata: { source: 'web', event: 'IATF_IA_DONE' },
    })

    revalidatePath('/reproduction/protocolos/iatf')
    revalidatePath(`/reproduction/${participation.animalId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[recordIATFIA]', error)
    return { success: false, error: 'Erro ao registrar IA. Tente novamente.' }
  }
}

// ─── Registrar resultado do DG ─────────────────────────────

export async function updateIATFDGResult(
  participationId: string,
  result:          'CONFIRMED' | 'FAILED',
  observation?:    string,
): Promise<ActionResult<void>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    const participation = await prisma.iATFParticipation.findFirst({
      where: {
        id:       participationId,
        status:   'ACTIVE',
        protocol: { farmId },
      },
      select: {
        id:             true,
        reproductionId: true,
        animalId:       true,
        iaDone:         true,
        protocol:       { select: { prevParto: true, d10Date: true } },
      },
    })

    if (!participation)        return { success: false, error: 'Participação não encontrada ou já encerrada' }
    if (!participation.iaDone) return { success: false, error: 'Registre a IA primeiro' }

    const resultText = result === 'CONFIRMED'
      ? `DG: Prenha${observation ? ' — ' + observation : ''}`
      : `DG: Vazia${observation ? ' — ' + observation : ''}`

    await prisma.$transaction(async (tx) => {
      if (participation.reproductionId) {
        const nextCheckDate = result === 'CONFIRMED'
          ? (participation.protocol.prevParto ?? addDays(participation.protocol.d10Date, 280))
          : undefined

        await tx.reproduction.update({
          where: { id: participation.reproductionId },
          data: {
            status: result,
            result: resultText,
            ...(nextCheckDate ? { nextCheckDate } : {}),
          },
        })
      }

      const newPartStatus = result === 'CONFIRMED' ? 'COMPLETED' : 'DISCONTINUED'

      await tx.iATFParticipation.update({
        where: { id: participationId },
        data: {
          status: newPartStatus as any,
          ...(result === 'FAILED' ? {
            discontinuedAt:     new Date(),
            discontinuedReason: `DG negativo${observation ? ': ' + observation : ''}`,
          } : {}),
        },
      })
    })

    auditUpdate({
      farmId, userId,
      entity:   'IATFParticipation',
      entityId: participationId,
      before:   { status: 'ACTIVE' },
      after:    { result, resultText },
      metadata: { source: 'web', event: 'IATF_DG_UPDATE', result },
    })

    revalidatePath('/reproduction/protocolos/iatf')
    revalidatePath(`/reproduction/${participation.animalId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateIATFDGResult]', error)
    return { success: false, error: 'Erro ao registrar resultado. Tente novamente.' }
  }
}

// ─── Descontinuar animal do protocolo ─────────────────────

export async function discontinueIATFAnimal(
  participationId: string,
  reason?:         string,
): Promise<ActionResult<void>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    const participation = await prisma.iATFParticipation.findFirst({
      where: { id: participationId, status: 'ACTIVE', protocol: { farmId } },
      select: { id: true, animalId: true, reproductionId: true },
    })
    if (!participation) return { success: false, error: 'Participação não encontrada ou já encerrada' }

    await prisma.$transaction(async (tx) => {
      await tx.iATFParticipation.update({
        where: { id: participationId },
        data: {
          status:             'DISCONTINUED',
          discontinuedAt:     new Date(),
          discontinuedReason: reason || null,
        },
      })

      if (participation.reproductionId) {
        await tx.reproduction.update({
          where: { id: participation.reproductionId },
          data: {
            status: 'FAILED',
            result: reason ? `Descontinuado: ${reason}` : 'Descontinuado do protocolo',
          },
        })
      }
    })

    auditUpdate({
      farmId, userId,
      entity:   'IATFParticipation',
      entityId: participationId,
      before:   { status: 'ACTIVE' },
      after:    { status: 'DISCONTINUED', reason: reason || null },
      metadata: { source: 'web', event: 'IATF_DISCONTINUE' },
    })

    revalidatePath('/reproduction/protocolos/iatf')
    revalidatePath(`/reproduction/${participation.animalId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[discontinueIATFAnimal]', error)
    return { success: false, error: 'Erro ao descontinuar. Tente novamente.' }
  }
}
