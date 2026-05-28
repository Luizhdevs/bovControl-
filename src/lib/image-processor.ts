/**
 * image-processor.ts — Compressão e geração de thumbnail com sharp.
 *
 * Pipeline:
 *   1. Detectar formato e converter qualquer entrada → WebP
 *   2. Aplicar orientação EXIF antes de redimensionar
 *   3. Redimensionar até MAX_DIMENSION px (nunca amplia)
 *   4. Sharpen suave para realçar textura natural (pelos, rosto, vegetação)
 *   5. Exportar WebP — alvo ≤450 KB para original, ≤80 KB para thumbnail
 *   6. Strip completo de metadados EXIF (privacidade + tamanho)
 *
 * Retorna os dois buffers e estatísticas para observabilidade.
 */

import sharp from 'sharp'

// ─── Configuração ──────────────────────────────────────────────────────────

const MAX_DIMENSION   = 1_920  // px — lado maior da imagem original
const THUMB_DIMENSION = 400    // px — lado maior do thumbnail
const WEBP_QUALITY    = 85     // alvo ≤450 KB; WebP 85 ≈ JPEG 95 em qualidade
const THUMB_QUALITY   = 80     // alvo ≤80 KB
const WEBP_EFFORT     = 4      // 0-6: compromisso velocidade/compressão (4 = equilibrado)
const THUMB_EFFORT    = 3      // thumbnails geram mais rápido — effort menor

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type ProcessedImage = {
  /** Buffer da imagem principal (WebP, ≤1920px, ≤~450KB) */
  imageBuffer:     Buffer
  /** Buffer do thumbnail (WebP, ≤400px, ≤~80KB) */
  thumbBuffer:     Buffer
  /** Extensão de saída */
  ext:             'webp'
  /** MIME type de saída */
  mimeType:        'image/webp'
  /** Dimensões da imagem principal após processamento */
  width:           number
  height:          number
  /** Stats para observabilidade */
  stats: {
    originalSizeKb:  number
    finalSizeKb:     number
    thumbSizeKb:     number
    compressionPct:  number
    processingMs:    number
  }
}

// ─── Validação de magic bytes ──────────────────────────────────────────────

/**
 * Verifica a assinatura binária do arquivo.
 * Rejeita qualquer coisa que não seja JPEG, PNG, WebP ou HEIC.
 * Não confia no Content-Type/extensão fornecidos pelo cliente.
 */
export function validateMagicBytes(buffer: Buffer): void {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4E && buffer[3] === 0x47
  ) return

  // WebP: RIFF????WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 &&
    buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 &&
    buffer[10] === 0x42 && buffer[11] === 0x50
  ) return

  // HEIC / HEIF: 'ftyp' at offset 4
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') return

  throw new Error(
    'Formato de imagem não suportado. Envie JPEG, PNG, WebP ou HEIC.'
  )
}

// ─── Processamento principal ───────────────────────────────────────────────

/**
 * Recebe o buffer bruto do upload e retorna imagem principal + thumbnail
 * em WebP. Lança em caso de formato inválido ou falha sharp.
 */
export async function processImage(
  inputBuffer:      Buffer,
  originalFilename: string,  // usado apenas para log
): Promise<ProcessedImage> {
  const start          = Date.now()
  const originalSizeKb = Math.round(inputBuffer.byteLength / 1024)

  validateMagicBytes(inputBuffer)

  // ── Imagem principal ────────────────────────────────────────────────────
  // .rotate() aplica orientação EXIF e descarta todos os metadados antes
  // de qualquer operação. withoutEnlargement garante que imagens pequenas
  // não são ampliadas. .sharpen() realça borda/textura natural (pelos,
  // rosto, vegetação) sem introduzir artefatos de blur ou oversmoothing.
  const imageBuffer = await sharp(inputBuffer, { failOn: 'error' })
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit:                'inside',
      withoutEnlargement: true,
    })
    .sharpen()
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
    .toBuffer()

  const meta = await sharp(imageBuffer).metadata()

  // ── Thumbnail ───────────────────────────────────────────────────────────
  // Parte do buffer já processado (orientação correta, metadados removidos).
  // withoutEnlargement: thumbnail nunca amplia — se o original for menor
  // que 400px, o thumbnail terá o mesmo tamanho da imagem original.
  const thumbBuffer = await sharp(imageBuffer)
    .resize(THUMB_DIMENSION, THUMB_DIMENSION, {
      fit:                'inside',
      withoutEnlargement: true,
    })
    .sharpen()
    .webp({ quality: THUMB_QUALITY, effort: THUMB_EFFORT })
    .toBuffer()

  const finalSizeKb    = Math.round(imageBuffer.byteLength / 1024)
  const thumbSizeKb    = Math.round(thumbBuffer.byteLength / 1024)
  const compressionPct = originalSizeKb > 0
    ? Math.round((1 - finalSizeKb / originalSizeKb) * 100)
    : 0
  const processingMs   = Date.now() - start

  console.log(
    `[image-processor] ${originalFilename} | ` +
    `original=${originalSizeKb}KB → webp=${finalSizeKb}KB (${compressionPct}% off) ` +
    `thumb=${thumbSizeKb}KB | ${meta.width}×${meta.height} | ${processingMs}ms`
  )

  return {
    imageBuffer,
    thumbBuffer,
    ext:      'webp',
    mimeType: 'image/webp',
    width:    meta.width  ?? 0,
    height:   meta.height ?? 0,
    stats: {
      originalSizeKb,
      finalSizeKb,
      thumbSizeKb,
      compressionPct,
      processingMs,
    },
  }
}
