/**
 * API Route de upload de fotos — armazenamento local (desenvolvimento).
 *
 * Aceita multipart/form-data com campo "file".
 * Salva em public/uploads/animals/ e retorna a URL absoluta.
 *
 * Produção: substituir writeFile por put() do @vercel/blob com
 * BLOB_READ_WRITE_TOKEN real e remover as importações de fs/path.
 */

import { writeFile, mkdir } from 'fs/promises'
import { join }             from 'path'
import { randomUUID }       from 'crypto'
import { NextResponse }     from 'next/server'
import { auth }             from '@/lib/auth'

const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Autenticação
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // 2. Lê o arquivo do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // 3. Valida MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato não permitido. Use JPEG, PNG, WebP ou HEIC.' },
        { status: 400 },
      )
    }

    // 4. Valida tamanho
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo de 10 MB.' },
        { status: 400 },
      )
    }

    // 5. Gera nome único e salva em public/uploads/animals/
    const ext      = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const filename = `${randomUUID()}.${ext}`

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'animals')
    await mkdir(uploadDir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(uploadDir, filename), buffer)

    // 6. URL absoluta — passa em z.string().url() do addPhotoSchema
    const origin = new URL(request.url).origin
    const url    = `${origin}/uploads/animals/${filename}`

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[upload]', error)
    return NextResponse.json({ error: 'Erro interno no upload' }, { status: 500 })
  }
}
