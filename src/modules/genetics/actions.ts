'use server'

import { revalidatePath }  from 'next/cache'
import { prisma }          from '@/lib/prisma'
import { auth }            from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit'
import { geneticProfileSchema, breedingGoalSchema } from './schema'

type Result<T = void> = { success: true; data?: T } | { success: false; error: string }

// ─── Touro ────────────────────────────────────────────────

export async function createBull(farmId: string, raw: unknown): Promise<Result<{ id: string }>> {
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado' }

  const parsed = geneticProfileSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]!.message }

  await requireFarmAccess(session.user.id, farmId, 'MANAGER')

  const bull = await prisma.geneticProfile.create({
    data: { farmId, ...parsed.data },
    select: { id: true },
  })

  auditCreate({
    farmId, userId: session.user.id,
    entity: 'GeneticProfile', entityId: bull.id,
    after: parsed.data, metadata: { source: 'web' },
  })

  revalidatePath('/genetics')
  return { success: true, data: { id: bull.id } }
}

export async function updateBull(farmId: string, id: string, raw: unknown): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado' }

  const parsed = geneticProfileSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]!.message }

  await requireFarmAccess(session.user.id, farmId, 'MANAGER')

  const existing = await prisma.geneticProfile.findFirst({ where: { id, farmId } })
  if (!existing) return { success: false, error: 'Touro não encontrado' }

  await prisma.geneticProfile.update({ where: { id }, data: parsed.data })

  auditUpdate({
    farmId, userId: session.user.id,
    entity: 'GeneticProfile', entityId: id,
    before: existing, after: parsed.data, metadata: { source: 'web' },
  })

  revalidatePath('/genetics')
  return { success: true }
}

export async function deactivateBull(farmId: string, id: string): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado' }

  await requireFarmAccess(session.user.id, farmId, 'MANAGER')

  const existing = await prisma.geneticProfile.findFirst({ where: { id, farmId } })
  if (!existing) return { success: false, error: 'Touro não encontrado' }

  await prisma.geneticProfile.update({ where: { id }, data: { active: false } })

  auditUpdate({
    farmId, userId: session.user.id,
    entity: 'GeneticProfile', entityId: id,
    before: { active: true }, after: { active: false }, metadata: { source: 'web' },
  })

  revalidatePath('/genetics')
  return { success: true }
}

// ─── Metas da fazenda ─────────────────────────────────────

export async function saveBreedingGoal(farmId: string, raw: unknown): Promise<Result> {
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado' }

  const parsed = breedingGoalSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.errors[0]!.message }

  await requireFarmAccess(session.user.id, farmId, 'MANAGER')

  await prisma.farmBreedingGoal.upsert({
    where:  { farmId },
    create: { farmId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath('/genetics')
  return { success: true }
}
