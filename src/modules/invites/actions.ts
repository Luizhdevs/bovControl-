'use server'

import { revalidatePath }     from 'next/cache'
import { randomBytes }        from 'crypto'
import { addDays }            from 'date-fns'
import { prisma }             from '@/lib/prisma'
import { auth }               from '@/lib/auth'
import { requireFarmAccess }  from '@/lib/permissions'
import { createInviteSchema } from './schema'
import type { ActionResult }  from './types'

// ─── Criar convite (OWNER only) ──────────────────────────

export async function createInvite(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ token: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'OWNER')

    const parsed = createInviteSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const { email, role } = parsed.data

    // Anti-replay: convite pendente já existe para este e-mail nesta fazenda?
    const existing = await prisma.invite.findFirst({
      where: { farmId, email, status: 'PENDING' },
    })
    if (existing) {
      return { success: false, error: 'Já existe um convite pendente para este e-mail.' }
    }

    // Usuário já é membro?
    const existingUser = await prisma.user.findUnique({
      where:  { email },
      select: { id: true, farmUsers: { where: { farmId }, select: { id: true } } },
    })
    if (existingUser && existingUser.farmUsers.length > 0) {
      return { success: false, error: 'Este usuário já é membro desta fazenda.' }
    }

    const token     = randomBytes(32).toString('hex')
    const expiresAt = addDays(new Date(), 7)

    const invite = await prisma.invite.create({
      data: {
        farmId,
        email,
        role,
        token,
        expiresAt,
        createdById: session.user.id,
      },
      select: { token: true },
    })

    revalidatePath('/settings')
    return { success: true, data: { token: invite.token } }
  } catch (error) {
    console.error('[createInvite]', error)
    return { success: false, error: 'Erro ao criar convite. Tente novamente.' }
  }
}

// ─── Revogar convite (OWNER only) ────────────────────────

export async function revokeInvite(
  inviteId: string,
  farmId:   string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'OWNER')

    const invite = await prisma.invite.findFirst({
      where: { id: inviteId, farmId, status: 'PENDING' },
    })
    if (!invite) return { success: false, error: 'Convite não encontrado ou já processado.' }

    await prisma.invite.update({
      where: { id: inviteId },
      data:  { status: 'REVOKED' },
    })

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[revokeInvite]', error)
    return { success: false, error: 'Erro ao revogar convite.' }
  }
}

// ─── Aceitar convite ($transaction — anti-replay garantido) ──

export async function acceptInvite(
  token: string,
): Promise<ActionResult<{ farmId: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Faça login para aceitar o convite.' }

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where:  { token },
        select: { id: true, farmId: true, email: true, role: true, status: true, expiresAt: true },
      })

      if (!invite)                          throw new Error('Convite não encontrado.')
      if (invite.status !== 'PENDING')      throw new Error('Este convite já foi usado ou foi revogado.')
      if (invite.expiresAt < new Date())    throw new Error('Este convite expirou.')
      // Comparação case-insensitive para email
      if (invite.email.toLowerCase() !== (session.user.email ?? '').toLowerCase()) {
        throw new Error(
          `Este convite é para ${invite.email}. Você está logado como ${session.user.email}.`,
        )
      }

      const alreadyMember = await tx.farmUser.findFirst({
        where: { farmId: invite.farmId, userId: session.user.id },
      })
      if (alreadyMember) throw new Error('Você já é membro desta fazenda.')

      // Cria vínculo farm-user
      await tx.farmUser.create({
        data: { farmId: invite.farmId, userId: session.user.id, role: invite.role },
      })

      // Marca como aceito — atomicamente evita replay
      await tx.invite.update({
        where: { id: invite.id },
        data:  { status: 'ACCEPTED', usedAt: new Date() },
      })

      return { farmId: invite.farmId }
    })

    return { success: true, data: result }
  } catch (error) {
    console.error('[acceptInvite]', error)
    const message = error instanceof Error ? error.message : 'Erro ao aceitar convite.'
    return { success: false, error: message }
  }
}
