/**
 * image-processor.ts — Compressão e geração de thumbnail com sharp.
 *
 * Pipeline:
 *   1. Detectar formato e converter HEIC → JPEG (sharp suporta via libvips)
 *   2. Redimensionar mantendo aspect ratio até MAX_DIMENSION px
 *   3. Exportar JPEG (75%) — alvo ≤300 KB para imagem original
 *   4. Gerar thumbnail 300px (75%) — ≤30 KB tipicamente
 *   5. Strip de todos os metadados EXIF (privacidade + tamanho)
 *
 * Retorna os dois buffers e estatísticas para log de observabilidade.
 */

import sharp from 'sharp'

// ─── Configuração ──────────────────────────────────────────────────────────

const MAX_DIMENSION    = 1_600   // px — lado maior
const THUMB_DIMENSION  = 300     // px — lado maior do thumbnail
const JPEG_QUALITY     = 78      // 75-80% range: melhor equilíbrio tamanho/qualidade
const THUMB_QUALITY    = 75

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type ProcessedImage = {
  /** Buffer da imagem principal (JPEG, ≤1600px, ≤~300KB) */
  imageBuffer:     Buffer
  /** Buffer do thumbnail (JPEG, ≤300px) */
  thumbBuffer:     Buffer
  /** Extensão de saída — sempre 'jpg' */
  ext:             'jpg'
  /** MIME type de saída */
  mimeType:        'image/jpeg'
  /** Dimensões da imagem principal */
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
 *
 * Não confia no Content-Type/extensão fornecidos pelo cliente.
 */
export function validateMagicBytes(buffer: Buffer): void {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 &&
    buffer[2] === 0x4E && buffer[3] === 0x47
  ) return

  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 &&
    buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 &&
    buffer[10] === 0x42 && buffer[11] === 0x50
  ) return

  // HEIC / HEIF: 'ftyp' at offset 4
  // Variants: heic, heics, heif, heifs, mif1, msf1
  if (buffer.length >= 12) {
    const ftyp = buffer.toString('ascii', 4, 8)
    if (ftyp === 'ftyp') return
  }

  throw new Error(
    'Formato de imagem não suportado. Envie JPEG, PNG, WebP ou HEIC.'
  )
}

// ─── Processamento principal ───────────────────────────────────────────────

/**
 * Recebe o buffer bruto do upload, retorna imagem principal + thumbnail
 * comprimidos como JPEG. Lança em caso de formato inválido ou falha sharp.
 */
export async function processImage(
  inputBuffer: Buffer,
  originalFilename: string,  // usado apenas para log
): Promise<ProcessedImage> {
  const start          = Date.now()
  const originalSizeKb = Math.round(inputBuffer.byteLength / 1024)

  // Valida magic bytes antes de qualquer processamento
  validateMagicBytes(inputBuffer)

  // Pipeline da imagem principal
  // Sharp strips all metadata by default (EXIF/IPTC/XMP não são copiados).
  // Chamamos .rotate() antes de qualquer resize para honrar a orientação EXIF
  // contida no original antes de ele ser descartado.
  const sharpInstance = sharp(inputBuffer, { failOn: 'error' })
    .rotate()                               // aplica orientação EXIF e descarta metadados
    .resize(MAX_DIMENSION, MAX_DIMENSION, {
      fit:                'inside',         // mantém aspect ratio, nunca amplia
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })

  const imageBuffer = await sharpInstance.toBuffer()
  const meta        = await sharp(imageBuffer).metadata()

  // Pipeline do thumbnail (reutiliza o buffer já redimensionado — mais rápido)
  // Metadados já foram descartados no pipeline da imagem principal.
  const thumbBuffer = await sharp(imageBuffer)
    .resize(THUMB_DIMENSION, THUMB_DIMENSION, {
      fit:                'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toBuffer()

  const finalSizeKb   = Math.round(imageBuffer.byteLength / 1024)
  const thumbSizeKb   = Math.round(thumbBuffer.byteLength / 1024)
  const compressionPct = originalSizeKb > 0
    ? Math.round((1 - finalSizeKb / originalSizeKb) * 100)
    : 0
  const processingMs  = Date.now() - start

  // Observabilidade
  console.log(
    `[image-processor] ${originalFilename} | ` +
    `original=${originalSizeKb}KB → final=${finalSizeKb}KB (${compressionPct}% off) ` +
    `thumb=${thumbSizeKb}KB | ${processingMs}ms`
  )

  return {
    imageBuffer,
    thumbBuffer,
    ext:      'jpg',
    mimeType: 'image/jpeg',
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
