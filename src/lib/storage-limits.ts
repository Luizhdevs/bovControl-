/**
 * storage-limits.ts — Controle de limites de armazenamento por fazenda.
 *
 * Limites do plano gratuito:
 *   MAX_IMAGES_PER_FARM_FREE = 1 500 imagens
 *   MAX_STORAGE_MB_FREE      = 1 024 MB (1 GB)
 *   MAX_IMAGE_SIZE_MB        = 5 MB por upload
 *
 * Os contadores (storageUsedMb, imageCount) são mantidos na tabela farms
 * e atualizados em $transaction junto com cada upload ou delete, para
 * garantir consistência sem depender de queries de agregação em tempo real.
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// ─── Constantes ────────────────────────────────────────────────────────────

export const MAX_IMAGES_PER_FARM_FREE = 1_500
export const MAX_STORAGE_MB_FREE      = 1_024   // 1 GB
export const MAX_IMAGE_SIZE_MB        = 5
export const MAX_IMAGE_SIZE_BYTES     = MAX_IMAGE_SIZE_MB * 1024 * 1024

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type StorageStatus = {
  imageCount:    number
  storageUsedMb: number
  imageLimit:    number
  storageLimitMb: number
  imageUsagePct:   number
  storageUsagePct: number
  withinLimits:    boolean
}

// ─── Verificar limite antes de upload ──────────────────────────────────────

/**
 * Retorna `true` quando a fazenda ainda tem espaço para mais uma imagem.
 * Lança `Error` com mensagem amigável se qualquer limite for ultrapassado.
 */
export async function checkStorageLimit(
  farmId:       string,
  uploadSizeKb: number,       // tamanho do arquivo que será adicionado
): Promise<void> {
  const farm = await prisma.farm.findUnique({
    where:  { id: farmId },
    select: { imageCount: true, storageUsedMb: true },
  })

  if (!farm) throw new Error('Fazenda não encontrada.')

  if (farm.imageCount >= MAX_IMAGES_PER_FARM_FREE) {
    throw new Error(
      `Limite de imagens atingido (${MAX_IMAGES_PER_FARM_FREE.toLocaleString('pt-BR')}). ` +
      'Exclua fotos antigas para continuar.'
    )
  }

  const uploadSizeMb   = uploadSizeKb / 1024
  const projectedTotal = farm.storageUsedMb + uploadSizeMb

  if (projectedTotal > MAX_STORAGE_MB_FREE) {
    const remaining = Math.max(0, MAX_STORAGE_MB_FREE - farm.storageUsedMb)
    throw new Error(
      `Armazenamento insuficiente. Disponível: ${remaining.toFixed(1)} MB. ` +
      'Exclua fotos antigas para liberar espaço.'
    )
  }
}

// ─── Incrementar contadores após upload ────────────────────────────────────

/**
 * Incrementa imageCount e storageUsedMb.
 * Deve ser chamado DENTRO de uma $transaction (tx passado como argumento).
 */
export async function incrementStorageCounters(
  tx:          Prisma.TransactionClient,
  farmId:      string,
  deltaSizeKb: number,    // tamanho total (original + thumbnail) em KB
): Promise<void> {
  await tx.farm.update({
    where: { id: farmId },
    data: {
      imageCount:    { increment: 1 },
      storageUsedMb: { increment: deltaSizeKb / 1024 },
    },
  })
}

// ─── Decrementar contadores após delete ────────────────────────────────────

/**
 * Decrementa imageCount e storageUsedMb.
 * Deve ser chamado DENTRO de uma $transaction.
 * Nunca vai abaixo de zero (proteção contra inconsistências históricas).
 */
export async function decrementStorageCounters(
  tx:          Prisma.TransactionClient,
  farmId:      string,
  deltaSizeKb: number,
): Promise<void> {
  // GREATEST(0, ...) garante que os contadores nunca ficam negativos sem
  // precisar de um SELECT separado — substitui o padrão read-modify-write
  // por uma única instrução atômica no banco.
  const deltaMb = deltaSizeKb / 1024
  await tx.$executeRaw`
    UPDATE farms
    SET
      "imageCount"    = GREATEST(0, "imageCount"    - 1),
      "storageUsedMb" = GREATEST(0, "storageUsedMb" - ${deltaMb})
    WHERE id = ${farmId}
  `
}

// ─── Dashboard de uso ──────────────────────────────────────────────────────

export async function getStorageStatus(farmId: string): Promise<StorageStatus> {
  const farm = await prisma.farm.findUnique({
    where:  { id: farmId },
    select: { imageCount: true, storageUsedMb: true },
  })

  const imageCount    = farm?.imageCount    ?? 0
  const storageUsedMb = farm?.storageUsedMb ?? 0

  return {
    imageCount,
    storageUsedMb,
    imageLimit:      MAX_IMAGES_PER_FARM_FREE,
    storageLimitMb:  MAX_STORAGE_MB_FREE,
    imageUsagePct:   Math.min(100, (imageCount    / MAX_IMAGES_PER_FARM_FREE) * 100),
    storageUsagePct: Math.min(100, (storageUsedMb / MAX_STORAGE_MB_FREE)      * 100),
    withinLimits:
      imageCount    < MAX_IMAGES_PER_FARM_FREE &&
      storageUsedMb < MAX_STORAGE_MB_FREE,
  }
}
