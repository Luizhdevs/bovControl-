/**
 * /api/upload — Upload de fotos de animais.
 *
 * Pipeline:
 *   1. Autenticação JWT
 *   2. Rate limit: 20 uploads/min por usuário (em memória)
 *   3. Validação de ownership do animal (anti-IDOR)
 *   4. Validação de tamanho (≤5 MB) e magic bytes
 *   5. Verificação de limites de storage da fazenda
 *   6. Compressão sharp + geração de thumbnail (image-processor)
 *   7. Upload para blob storage dev/prod (blob-storage)
 *   8. Retorna { url, thumbnailUrl, sizeKb } para o action addAnimalPhoto
 *
 * O action addAnimalPhoto persiste o registro e atualiza os contadores
 * em $transaction — esta rota apenas faz o upload e retorna as URLs.
 */

import { randomUUID }   from 'crypto'
import { NextResponse } from 'next/server'
import { auth }         from '@/lib/auth'
import { prisma }       from '@/lib/prisma'
import {
  checkStorageLimit,
  MAX_IMAGE_SIZE_BYTES,
} from '@/lib/storage-limits'
import { checkUploadRateLimit, getRemainingUploads } from '@/lib/upload-rate-limit'
import { processImage }    from '@/lib/image-processor'
import { uploadFile }      from '@/lib/blob-storage'

// Tipos MIME aceitos pelo servidor — a validação real é por magic bytes,
// esta lista é apenas para feedback rápido antes de ler o buffer.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export async function POST(request: Request): Promise<NextResponse> {
  // ── 1. Autenticação ──────────────────────────────────────────────────────
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const userId = session.user.id

  // ── 2. Rate limit ────────────────────────────────────────────────────────
  const rateResult = checkUploadRateLimit(userId)
  if (!rateResult.allowed) {
    const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000)
    return NextResponse.json(
      { error: `Muitos uploads. Aguarde ${retryAfterSec}s e tente novamente.` },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      },
    )
  }

  try {
    // ── 3. Lê FormData ───────────────────────────────────────────────────
    const formData = await request.formData()
    const file     = formData.get('file')     as File   | null
    const animalId = formData.get('animalId') as string | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }
    if (!animalId) {
      return NextResponse.json({ error: 'animalId é obrigatório' }, { status: 400 })
    }

    // Feedback rápido antes de ler o buffer
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Formato não permitido. Use JPEG, PNG, WebP ou HEIC.' },
        { status: 400 },
      )
    }

    // ── 4a. Valida tamanho antes de ler o buffer ─────────────────────────
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Máximo de 5 MB.` },
        { status: 400 },
      )
    }

    // ── 4b. Ownership do animal (anti-IDOR) — 1 query com JOIN ──────────
    // Verifica em um único roundtrip que o animal existe E pertence a uma
    // fazenda onde o usuário é membro. Retorna farmId para reutilizar abaixo.
    const animal = await prisma.animal.findFirst({
      where: {
        id:   animalId,
        farm: { users: { some: { userId } } },
      },
      select: { id: true, farmId: true },
    })
    if (!animal) {
      return NextResponse.json({ error: 'Animal não encontrado' }, { status: 403 })
    }

    // ── 5. Verifica limites de storage ───────────────────────────────────
    // Usa o tamanho original em KB como estimativa conservadora antes de comprimir
    const estimatedKb = Math.ceil(file.size / 1024)
    try {
      await checkStorageLimit(animal.farmId, estimatedKb)
    } catch (limitErr) {
      return NextResponse.json(
        { error: (limitErr as Error).message },
        { status: 413 },
      )
    }

    // ── 6. Lê buffer + valida magic bytes + comprime ─────────────────────
    const rawBuffer = Buffer.from(await file.arrayBuffer())

    let processed: Awaited<ReturnType<typeof processImage>>
    try {
      processed = await processImage(rawBuffer, file.name)
    } catch (imgErr) {
      return NextResponse.json(
        { error: (imgErr as Error).message },
        { status: 400 },
      )
    }

    // ── 7. Upload para blob storage ──────────────────────────────────────
    const uuid       = randomUUID()
    const imgPath    = `animals/${animalId}/${uuid}.jpg`
    const thumbPath  = `animals/${animalId}/thumb_${uuid}.jpg`

    const [imgResult, thumbResult] = await Promise.all([
      uploadFile(imgPath,   processed.imageBuffer, 'image/jpeg'),
      uploadFile(thumbPath, processed.thumbBuffer,  'image/jpeg'),
    ])

    // sizeKb combinado (original + thumb) — armazenado em AnimalPhoto
    const sizeKb = processed.stats.finalSizeKb + processed.stats.thumbSizeKb

    // ── 8. Responde com URLs e tamanho ───────────────────────────────────
    const remaining = getRemainingUploads(userId)

    return NextResponse.json(
      {
        url:          imgResult.url,
        thumbnailUrl: thumbResult.url,
        sizeKb,
      },
      {
        headers: {
          'X-Upload-Remaining': String(remaining),
        },
      },
    )
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Erro interno no upload' }, { status: 500 })
  }
}
