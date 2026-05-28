/**
 * storage-migrate.ts — Migra fotos de uploads locais para Cloudflare R2.
 *
 * Encontra todos os registros AnimalPhoto com URL local (/uploads/...),
 * faz o upload para R2 com o novo path (animals/{farmId}/{animalId}/...),
 * atualiza o banco de dados e (opcional) remove os arquivos locais.
 *
 * Uso:
 *   tsx scripts/storage-migrate.ts --dry-run    # apenas lista o que seria migrado
 *   tsx scripts/storage-migrate.ts              # migração real
 *   tsx scripts/storage-migrate.ts --delete-local  # migra e remove arquivos locais
 */

import path  from 'path'
import fs    from 'fs/promises'
import { prisma }           from '@/lib/prisma'
import { R2StorageProvider } from '@/lib/storage/r2-storage'

const isDryRun     = process.argv.includes('--dry-run')
const deleteLocal  = process.argv.includes('--delete-local')
const UPLOADS_DIR  = path.join(process.cwd(), 'public', 'uploads')

async function main() {
  console.log(`\n── Storage Migration ${isDryRun ? '(DRY RUN)' : ''} ──────────────────`)
  if (deleteLocal && !isDryRun) console.log('⚠  --delete-local: arquivos locais serão removidos após upload')

  const photos = await prisma.animalPhoto.findMany({
    where:  { url: { startsWith: '/uploads/' } },
    select: {
      id:           true,
      url:          true,
      thumbnailUrl: true,
      animal: { select: { id: true, farmId: true } },
    },
  })

  if (photos.length === 0) {
    console.log('Nenhuma foto local encontrada. Nada a migrar.')
    return
  }

  console.log(`Encontradas ${photos.length} foto(s) para migrar.\n`)

  const r2 = isDryRun ? null : new R2StorageProvider()

  let migrated = 0
  let skipped  = 0
  let errors   = 0

  for (const photo of photos) {
    const imgRelative = photo.url.replace(/^\/uploads\//, '')
    const parts       = imgRelative.split('/')
    // parts: ['animals', '{animalId}', '{filename}.webp']
    const filename        = parts.slice(2).join('/')
    const newImgPathname  = `animals/${photo.animal.farmId}/${photo.animal.id}/${filename}`

    try {
      if (isDryRun) {
        console.log(`[DRY RUN] ${photo.url}`)
        console.log(`       → r2:${newImgPathname}`)
        if (photo.thumbnailUrl?.startsWith('/uploads/')) {
          const thumbRelative   = photo.thumbnailUrl.replace(/^\/uploads\//, '')
          const thumbParts      = thumbRelative.split('/')
          const thumbFilename   = thumbParts.slice(2).join('/')
          const newThumbPath    = `animals/${photo.animal.farmId}/${photo.animal.id}/${thumbFilename}`
          console.log(`  thumb → r2:${newThumbPath}`)
        }
        migrated++
        continue
      }

      // Lê o arquivo original
      const imgPath  = path.join(UPLOADS_DIR, imgRelative)
      const imgBuffer = await fs.readFile(imgPath)

      // Upload para R2
      const imgResult = await r2!.upload(newImgPathname, imgBuffer, 'image/webp')

      let newThumbUrl: string | null = null

      if (photo.thumbnailUrl?.startsWith('/uploads/')) {
        const thumbRelative   = photo.thumbnailUrl.replace(/^\/uploads\//, '')
        const thumbParts      = thumbRelative.split('/')
        const thumbFilename   = thumbParts.slice(2).join('/')
        const newThumbPathname = `animals/${photo.animal.farmId}/${photo.animal.id}/${thumbFilename}`

        const thumbPath   = path.join(UPLOADS_DIR, thumbRelative)
        const thumbBuffer = await fs.readFile(thumbPath)
        const thumbResult = await r2!.upload(newThumbPathname, thumbBuffer, 'image/webp')
        newThumbUrl = thumbResult.url
      }

      // Atualiza DB
      await prisma.animalPhoto.update({
        where: { id: photo.id },
        data:  { url: imgResult.url, thumbnailUrl: newThumbUrl },
      })

      console.log(`✓ ${photo.url} → ${imgResult.url}`)

      // Remove arquivos locais se solicitado
      if (deleteLocal) {
        try { await fs.unlink(path.join(UPLOADS_DIR, imgRelative)) } catch { /* ignore */ }
        if (photo.thumbnailUrl?.startsWith('/uploads/')) {
          const thumbRelative = photo.thumbnailUrl.replace(/^\/uploads\//, '')
          try { await fs.unlink(path.join(UPLOADS_DIR, thumbRelative)) } catch { /* ignore */ }
        }
      }

      migrated++
    } catch (err) {
      console.error(`✗ Erro na foto ${photo.id} (${photo.url}):`, (err as Error).message)
      errors++
      skipped++
    }
  }

  console.log(`\nResultado: ${migrated} migradas, ${skipped} erros.`)
  if (isDryRun) console.log('(dry-run — nenhuma alteração foi feita)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
