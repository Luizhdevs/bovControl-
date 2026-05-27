import { prisma } from '@/lib/prisma'
import type { InviteWithCreator } from './types'

// ─── Convites de uma fazenda ──────────────────────────────

export async function getFarmInvites(farmId: string): Promise<InviteWithCreator[]> {
  const rows = await prisma.invite.findMany({
    where:   { farmId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take:    100,
  })

  return rows as InviteWithCreator[]
}

// ─── Lookup de convite por token (página pública) ─────────

export async function getInviteByToken(token: string) {
  return prisma.invite.findUnique({
    where:   { token },
    include: {
      farm: { select: { id: true, name: true, city: true, state: true } },
    },
  })
}
