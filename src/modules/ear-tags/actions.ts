'use server'

import { revalidatePath }    from 'next/cache'
import { prisma }            from '@/lib/prisma'
import { auth }              from '@/lib/auth'
import { requireFarmAccess } from '@/lib/permissions'
import { auditCreate, auditUpdate, auditDelete } from '@/lib/audit'
import { earTagTemplateSchema } from './schema'
import type { ActionResult } from './types'
import type { Prisma } from '@prisma/client'

// ─── Criar template ────────────────────────────────────────

export async function createEarTagTemplate(
  farmId:  string,
  rawData: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const parsed = earTagTemplateSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    const template = await prisma.earTagTemplate.create({
      data: {
        farmId,
        ...parsed.data,
        layoutJson: parsed.data.layoutJson as Prisma.InputJsonValue,
      },
      select: { id: true },
    })

    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'EarTagTemplate',
      entityId: template.id,
      after:    { name: parsed.data.name, widthMm: parsed.data.widthMm, heightMm: parsed.data.heightMm },
      metadata: { source: 'web' },
    })

    revalidatePath('/ear-tags')

    return { success: true, data: { id: template.id } }
  } catch (error) {
    console.error('[createEarTagTemplate]', error)
    return { success: false, error: 'Erro ao criar modelo. Tente novamente.' }
  }
}

// ─── Atualizar template ────────────────────────────────────

export async function updateEarTagTemplate(
  templateId: string,
  farmId:     string,
  rawData:    unknown,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.earTagTemplate.findFirst({
      where: { id: templateId, farmId },
    })
    if (!existing) return { success: false, error: 'Modelo não encontrado' }

    const parsed = earTagTemplateSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]!.message }
    }

    await prisma.earTagTemplate.update({
      where: { id: templateId },
      data: {
        ...parsed.data,
        layoutJson: parsed.data.layoutJson as Prisma.InputJsonValue,
      },
    })

    auditUpdate({
      farmId,
      userId:   session.user.id,
      entity:   'EarTagTemplate',
      entityId: templateId,
      before:   { name: existing.name },
      after:    { name: parsed.data.name },
      metadata: { source: 'web' },
    })

    revalidatePath('/ear-tags')
    revalidatePath(`/ear-tags/${templateId}/edit`)

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateEarTagTemplate]', error)
    return { success: false, error: 'Erro ao salvar modelo. Tente novamente.' }
  }
}

// ─── Duplicar template ─────────────────────────────────────

export async function duplicateEarTagTemplate(
  templateId: string,
  farmId:     string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const source = await prisma.earTagTemplate.findFirst({
      where: { id: templateId, farmId },
    })
    if (!source) return { success: false, error: 'Modelo não encontrado' }

    const copy = await prisma.earTagTemplate.create({
      data: {
        farmId:           source.farmId,
        name:             `${source.name} (cópia)`,
        widthMm:          source.widthMm,
        heightMm:         source.heightMm,
        paddingMm:        source.paddingMm,
        fontSizeMain:     source.fontSizeMain,
        fontSizeSecondary: source.fontSizeSecondary,
        qrSizeMm:         source.qrSizeMm,
        showAnimalName:   source.showAnimalName,
        showAnimalTag:    source.showAnimalTag,
        showFarmName:     source.showFarmName,
        showBorder:       source.showBorder,
        orientation:      source.orientation,
        bgColor:          source.bgColor,
        textColor:        source.textColor,
        layoutJson:       source.layoutJson ?? {},
      },
      select: { id: true },
    })

    auditCreate({
      farmId,
      userId:   session.user.id,
      entity:   'EarTagTemplate',
      entityId: copy.id,
      after:    { name: `${source.name} (cópia)`, duplicatedFrom: templateId },
      metadata: { source: 'web' },
    })

    revalidatePath('/ear-tags')

    return { success: true, data: { id: copy.id } }
  } catch (error) {
    console.error('[duplicateEarTagTemplate]', error)
    return { success: false, error: 'Erro ao duplicar modelo.' }
  }
}

// ─── Excluir template ──────────────────────────────────────

export async function deleteEarTagTemplate(
  templateId: string,
  farmId:     string,
): Promise<ActionResult<void>> {
  try {
    const session = await auth()
    if (!session) return { success: false, error: 'Não autorizado' }

    await requireFarmAccess(session.user.id, farmId, 'MANAGER')

    const existing = await prisma.earTagTemplate.findFirst({
      where:  { id: templateId, farmId },
      select: { id: true, name: true },
    })
    if (!existing) return { success: false, error: 'Modelo não encontrado' }

    await prisma.earTagTemplate.delete({ where: { id: templateId } })

    auditDelete({
      farmId,
      userId:   session.user.id,
      entity:   'EarTagTemplate',
      entityId: templateId,
      before:   { name: existing.name },
      metadata: { source: 'web' },
    })

    revalidatePath('/ear-tags')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteEarTagTemplate]', error)
    return { success: false, error: 'Erro ao excluir modelo.' }
  }
}
