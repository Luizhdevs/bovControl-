'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { getActiveFarm }     from '@/lib/active-farm'
import { requireFarmAccess } from '@/lib/permissions'
import { auditCreate, auditUpdate } from '@/lib/audit'
import type { ActionResult } from './types'

export type DGStage = 'DG_P30' | 'DG_P60'

// ─── Helpers ───────────────────────────────────────────────

async function getSessionFarm() {
  const session = await auth()
  if (!session) return null
  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return null
  return { userId: session.user.id, farmId: activeFarm.farmId }
}

// ─── Criar protocolo TE ────────────────────────────────────

interface CreateTEProtocolInput {
  name:        string
  opuDate:     string   // ISO date
  teDate:      string
  laboratorio: string
  touro:       string
  doadoras?:   string
  dgP30Start?: string
  dgP30End?:   string
  dgP60Start?: string
  dgP60End?:   string
  prevParto?:  string
  // Animais selecionados com dados individuais
  animals: {
    animalId:   string
    donor?:     string
    ovaQuality?: string
    sexo?:      string
  }[]
}

export async function createTEProtocol(
  input: CreateTEProtocolInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    if (!input.name.trim())          return { success: false, error: 'Nome do protocolo obrigatório' }
    if (input.animals.length === 0)  return { success: false, error: 'Selecione pelo menos um animal' }

    // Validar que todos os animais pertencem à fazenda e são fêmeas ativas
    const animalIds = input.animals.map((a) => a.animalId)
    const dbAnimals = await prisma.animal.findMany({
      where: { id: { in: animalIds }, farmId, status: 'ACTIVE', sex: 'FEMALE' },
      select: { id: true, tag: true },
    })
    if (dbAnimals.length !== animalIds.length) {
      return { success: false, error: 'Um ou mais animais inválidos' }
    }

    // Verificar que nenhum animal está ativo em outro protocolo
    const conflicting = await prisma.tEParticipation.findFirst({
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
        error: `${conflicting.animal.tag} já está ativo em outro protocolo`,
      }
    }

    const teDate = new Date(input.teDate)

    const protocol = await prisma.$transaction(async (tx) => {
      const proto = await tx.tEProtocol.create({
        data: {
          farmId,
          name:        input.name.trim(),
          opuDate:     new Date(input.opuDate),
          teDate,
          laboratorio: input.laboratorio || null,
          touro:       input.touro       || null,
          doadoras:    input.doadoras    || null,
          dgP30Start:  input.dgP30Start ? new Date(input.dgP30Start) : null,
          dgP30End:    input.dgP30End   ? new Date(input.dgP30End)   : null,
          dgP60Start:  input.dgP60Start ? new Date(input.dgP60Start) : null,
          dgP60End:    input.dgP60End   ? new Date(input.dgP60End)   : null,
          prevParto:   input.prevParto  ? new Date(input.prevParto)  : null,
        },
        select: { id: true },
      })

      // Criar Reproduction + TEParticipation para cada animal
      for (const a of input.animals) {
        const repro = await tx.reproduction.create({
          data: {
            animalId: a.animalId,
            type:     'INSEMINATION',
            status:   'PENDING',
            date:     teDate,
            bullName: `TE: ${input.touro}`,
            nextCheckDate: input.dgP30Start ? new Date(input.dgP30Start) : null,
            notes: JSON.stringify({
              tipo:        'TE',
              protocolId:  proto.id,
              teDate:      input.teDate,
              opuDate:     input.opuDate,
              laboratorio: input.laboratorio,
              touro:       input.touro,
              doadora:     a.donor,
              ovaQuality:  a.ovaQuality,
              sexo:        a.sexo,
            }),
          },
          select: { id: true },
        })

        await tx.tEParticipation.create({
          data: {
            protocolId:    proto.id,
            animalId:      a.animalId,
            reproductionId: repro.id,
            donor:         a.donor      || null,
            ovaQuality:    a.ovaQuality || null,
            sexo:          a.sexo       || null,
          },
        })
      }

      return proto
    })

    auditCreate({
      farmId,
      userId,
      entity:   'TEProtocol',
      entityId: protocol.id,
      after:    { name: input.name, teDate: input.teDate, animals: animalIds.length },
      metadata: { source: 'web' },
    })

    revalidatePath('/reproduction/protocolos/te')
    return { success: true, data: { id: protocol.id } }
  } catch (error) {
    console.error('[createTEProtocol]', error)
    return { success: false, error: 'Erro ao criar protocolo. Tente novamente.' }
  }
}

// ─── Migrar protocolo existente (TE Set/2026) ──────────────
// Linka os Reproduction registrados via script ao novo TEProtocol.

export async function migrateLegacyTEProtocol(): Promise<ActionResult<{ id: string }>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    // Verificar se já existe um protocolo migrado
    const existing = await prisma.tEProtocol.findFirst({
      where: { farmId, name: { contains: 'Set/2026' } },
    })
    if (existing) return { success: false, error: 'Protocolo Set/2026 já foi migrado' }

    // Buscar todos os Reproduction de TE sem TEParticipation
    const teRecords = await prisma.reproduction.findMany({
      where: {
        type:           'INSEMINATION',
        bullName:       { startsWith: 'TE:' },
        animal:         { farmId },
        teParticipation: null,
      },
      select: { id: true, animalId: true, notes: true, status: true },
    })

    if (teRecords.length === 0) {
      return { success: false, error: 'Nenhum registro TE legado encontrado' }
    }

    const protocol = await prisma.$transaction(async (tx) => {
      const proto = await tx.tEProtocol.create({
        data: {
          farmId,
          name:        'TE Set/2026 — ROZTAC-ET',
          opuDate:     new Date('2026-09-10'),
          teDate:      new Date('2026-09-18'),
          laboratorio: 'Eleva Embriões Ltda',
          touro:       'ROZTAC-ET (HOBRAM01420)',
          doadoras:    'AMARILIS EMO 73 / URBANISTA FIV PRLB',
          dgP30Start:  new Date('2026-10-10'),
          dgP30End:    new Date('2026-10-20'),
          dgP60Start:  new Date('2026-11-09'),
          dgP60End:    new Date('2026-11-19'),
          prevParto:   new Date('2027-06-16'),
        },
        select: { id: true },
      })

      for (const r of teRecords) {
        let meta: Record<string, string> = {}
        try { meta = JSON.parse(r.notes ?? '{}') } catch {}

        // Status da participação baseado no status do Reproduction
        const partStatus =
          r.status === 'CONFIRMED' ? 'COMPLETED' :
          r.status === 'FAILED'    ? 'DISCONTINUED' :
          'ACTIVE'

        await tx.tEParticipation.create({
          data: {
            protocolId:    proto.id,
            animalId:      r.animalId,
            reproductionId: r.id,
            donor:         meta.doadora    || null,
            ovaQuality:    meta.ovaQuality || null,
            sexo:          meta.sexo       || null,
            status:        partStatus as any,
          },
        })
      }

      return proto
    })

    auditCreate({
      farmId,
      userId,
      entity:   'TEProtocol',
      entityId: protocol.id,
      after:    { name: 'TE Set/2026 — ROZTAC-ET', migrated: true, records: teRecords.length },
      metadata: { source: 'web', event: 'TE_LEGACY_MIGRATION' },
    })

    revalidatePath('/reproduction/protocolos/te')
    return { success: true, data: { id: protocol.id } }
  } catch (error) {
    console.error('[migrateLegacyTEProtocol]', error)
    return { success: false, error: 'Erro na migração. Tente novamente.' }
  }
}

// ─── Registrar resultado do DG ─────────────────────────────

export async function updateDGResult(
  participationId: string,
  dgStage:         DGStage,
  newStatus:       'CONFIRMED' | 'FAILED',
  observation?:    string,
): Promise<ActionResult<void>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    const participation = await prisma.tEParticipation.findFirst({
      where: {
        id:       participationId,
        status:   'ACTIVE',
        protocol: { farmId },
      },
      select: {
        id:             true,
        reproductionId: true,
        animalId:       true,
        status:         true,
        reproduction:   { select: { status: true, result: true } },
      },
    })

    if (!participation) {
      return { success: false, error: 'Participação não encontrada ou já encerrada' }
    }

    const resultText = observation
      ? `${dgStage}: ${newStatus} — ${observation}`
      : `${dgStage}: ${newStatus}`

    await prisma.$transaction(async (tx) => {
      // Atualizar Reproduction se existir
      if (participation.reproductionId) {
        const nextCheckDate =
          dgStage === 'DG_P30' && newStatus === 'CONFIRMED'
            ? new Date('2026-11-14T12:00:00.000Z')
            : undefined

        await tx.reproduction.update({
          where: { id: participation.reproductionId },
          data: {
            status: newStatus,
            result: resultText,
            ...(nextCheckDate ? { nextCheckDate } : {}),
          },
        })
      }

      // Atualizar TEParticipation
      const newPartStatus =
        dgStage === 'DG_P60' && newStatus === 'CONFIRMED' ? 'COMPLETED' :
        newStatus === 'FAILED'                            ? 'DISCONTINUED' :
        'ACTIVE'

      await tx.tEParticipation.update({
        where: { id: participationId },
        data: {
          status: newPartStatus as any,
          ...(newStatus === 'FAILED' ? {
            discontinuedAt:     new Date(),
            discontinuedReason: `${dgStage} negativo${observation ? ': ' + observation : ''}`,
          } : {}),
        },
      })
    })

    auditUpdate({
      farmId,
      userId,
      entity:   'TEParticipation',
      entityId: participationId,
      before:   { status: participation.status },
      after:    { dgStage, result: newStatus, resultText },
      metadata: { source: 'web', event: 'TE_DG_UPDATE', dgStage },
    })

    revalidatePath('/reproduction/protocolos/te')
    revalidatePath(`/reproduction/${participation.animalId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateDGResult]', error)
    return { success: false, error: 'Erro ao registrar resultado. Tente novamente.' }
  }
}

// ─── Descontinuar animal do protocolo ─────────────────────

export async function discontinueAnimal(
  participationId: string,
  reason?:         string,
): Promise<ActionResult<void>> {
  try {
    const sf = await getSessionFarm()
    if (!sf) return { success: false, error: 'Não autorizado' }
    const { userId, farmId } = sf

    await requireFarmAccess(userId, farmId, 'MANAGER')

    const participation = await prisma.tEParticipation.findFirst({
      where: {
        id:       participationId,
        status:   'ACTIVE',
        protocol: { farmId },
      },
      select: { id: true, animalId: true, reproductionId: true },
    })

    if (!participation) {
      return { success: false, error: 'Participação não encontrada ou já encerrada' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.tEParticipation.update({
        where: { id: participationId },
        data: {
          status:            'DISCONTINUED',
          discontinuedAt:    new Date(),
          discontinuedReason: reason || null,
        },
      })

      // Marcar o Reproduction como FAILED
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
      farmId,
      userId,
      entity:   'TEParticipation',
      entityId: participationId,
      before:   { status: 'ACTIVE' },
      after:    { status: 'DISCONTINUED', reason: reason || null },
      metadata: { source: 'web', event: 'TE_DISCONTINUE' },
    })

    revalidatePath('/reproduction/protocolos/te')
    revalidatePath(`/reproduction/${participation.animalId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[discontinueAnimal]', error)
    return { success: false, error: 'Erro ao descontinuar. Tente novamente.' }
  }
}
