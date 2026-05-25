/**
 * API Route de upload de fotos — usa Vercel Blob.
 *
 * Instalar: npm install @vercel/blob
 * Configurar: BLOB_READ_WRITE_TOKEN no .env
 *
 * Fluxo:
 * 1. Cliente chama `upload()` do @vercel/blob/client apontando para esta rota
 * 2. Esta rota valida autenticação e gera token
 * 3. O blob é enviado direto para o CDN da Vercel
 * 4. URL retornada é salva via addAnimalPhoto action
 */

import { handleUpload, type HandleUploadBody } from '@vercel/blob/next'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Verifica autenticação antes de gerar token de upload
        const session = await auth()
        if (!session) {
          throw new Error('Não autorizado')
        }

        return {
          // Tipos de imagem permitidos
          allowedContentTypes: [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/heic',
          ],
          // Tamanho máximo: 10MB
          maximumSizeInBytes: 10 * 1024 * 1024,
          // Prefixo do path no blob storage
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        // Opcional: log de upload ou processamento pós-upload
        console.log('[upload] Blob uploaded:', blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    )
  }
}
