/**
 * blob-storage.ts — Abstração dev/prod para armazenamento de arquivos.
 *
 * Dev  (NODE_ENV !== 'production'): salva em public/uploads/animals/
 * Prod (NODE_ENV === 'production') : usa @vercel/blob (put / del)
 *
 * Retorna sempre a URL pública do arquivo salvo.
 * Nomes de arquivo: UUID gerado externamente — NUNCA o nome original do upload.
 *
 * Estrutura de paths no blob:
 *   animals/{animalId}/{uuid}.jpg          (imagem principal)
 *   animals/{animalId}/thumb_{uuid}.jpg    (thumbnail)
 */

import path from 'path'
import fs   from 'fs/promises'

// ─── Helpers ───────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production'

// Caminho base para uploads locais (somente dev)
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

// ─── Tipos ─────────────────────────────────────────────────────────────────

export type UploadResult = {
  url:      string
  pathname: string   // caminho relativo dentro do storage
}

// ─── Upload ────────────────────────────────────────────────────────────────

/**
 * Salva `buffer` no storage e retorna a URL pública.
 *
 * @param pathname  Caminho relativo, ex: "animals/abc123/uuid.jpg"
 * @param buffer    Conteúdo já processado (JPEG)
 * @param mimeType  "image/jpeg"
 */
export async function uploadFile(
  pathname: string,
  buffer:   Buffer,
  mimeType: string,
): Promise<UploadResult> {
  if (isProd) {
    return uploadToBlob(pathname, buffer, mimeType)
  }
  return uploadToLocal(pathname, buffer)
}

// ─── Delete ────────────────────────────────────────────────────────────────

/**
 * Remove o arquivo do storage.
 * Em dev: exclui o arquivo local.
 * Em prod: chama blob.del().
 *
 * Não lança em caso de arquivo já inexistente — idempotente.
 */
export async function deleteFile(url: string): Promise<void> {
  if (isProd) {
    await deleteFromBlob(url)
  } else {
    await deleteFromLocal(url)
  }
}

// ─── Implementação Local (dev) ─────────────────────────────────────────────

async function uploadToLocal(
  pathname: string,
  buffer:   Buffer,
): Promise<UploadResult> {
  const fullPath = path.join(LOCAL_UPLOADS_DIR, pathname)

  // Garante que o diretório existe
  await fs.mkdir(path.dirname(fullPath), { recursive: true })
  await fs.writeFile(fullPath, buffer)

  // URL pública: /uploads/animals/...
  const url = '/uploads/' + pathname.replace(/\\/g, '/')
  return { url, pathname }
}

async function deleteFromLocal(url: string): Promise<void> {
  // Converte URL pública de volta para caminho no filesystem
  // Ex: /uploads/animals/abc/uuid.jpg → public/uploads/animals/abc/uuid.jpg
  const relative = url.replace(/^\/uploads\//, '')
  const fullPath = path.join(LOCAL_UPLOADS_DIR, relative)
  try {
    await fs.unlink(fullPath)
  } catch {
    // Arquivo já removido — não é erro
  }
}

// ─── Implementação Vercel Blob (prod) ──────────────────────────────────────

async function uploadToBlob(
  pathname: string,
  buffer:   Buffer,
  mimeType: string,
): Promise<UploadResult> {
  // Import dinâmico — @vercel/blob só existe em prod e não precisa de bundle em dev
  const { put } = await import('@vercel/blob')

  const blob = await put(pathname, buffer, {
    access:      'public',
    contentType: mimeType,
    // addRandomSuffix: false — já usamos UUID no pathname
  })

  return { url: blob.url, pathname }
}

async function deleteFromBlob(url: string): Promise<void> {
  const { del } = await import('@vercel/blob')
  try {
    await del(url)
  } catch {
    // Já deletado ou inexistente — não propaga
  }
}
