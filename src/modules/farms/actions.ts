'use server'

import { cookies }        from 'next/headers'
import { revalidatePath } from 'next/cache'
import { auth }           from '@/lib/auth'
import { prisma }         from '@/lib/prisma'
import { createFarmSchema, type CreateFarmInput } from './schema'

const FARM_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 365, // 1 ano
}

// ─── Trocar fazenda ativa ──────────────────────────────────

export async function setActiveFarm(
  farmId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado' }

  // Valida que o usuário tem acesso à fazenda
  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id, farmId },
    select: { farmId: true },
  })
  if (!farmUser) return { success: false, error: 'Fazenda não encontrada' }

  const cookieStore = await cookies()
  cookieStore.set('active_farm_id', farmId, FARM_COOKIE_OPTIONS)

  revalidatePath('/', 'layout')
  return { success: true }
}

// ─── Criar nova fazenda ───────────────────────────────────

export async function createFarm(
  rawData: CreateFarmInput,
): Promise<{ success: true; data: { id: string; name: string } } | { success: false; error: string }> {
  const session = await auth()
  if (!session) return { success: false, error: 'Não autorizado' }

  // Apenas OWNER de pelo menos uma fazenda pode criar novas
  const existingOwnership = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id, role: 'OWNER' },
    select: { farmId: true },
  })
  if (!existingOwnership) {
    return { success: false, error: 'Apenas proprietários podem criar fazendas.' }
  }

  const parsed = createFarmSchema.safeParse(rawData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]!.message }
  }

  const { name, city, state } = parsed.data

  const farm = await prisma.$transaction(async (tx) => {
    const f = await tx.farm.create({
      data: { name, city: city || null, state },
    })
    await tx.farmUser.create({
      data: { farmId: f.id, userId: session.user.id, role: 'OWNER' },
    })
    return f
  })

  // Define a nova fazenda como ativa
  const cookieStore = await cookies()
  cookieStore.set('active_farm_id', farm.id, FARM_COOKIE_OPTIONS)

  revalidatePath('/', 'layout')
  return { success: true, data: { id: farm.id, name: farm.name } }
}
