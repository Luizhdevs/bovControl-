import path from 'path'
import fs   from 'fs/promises'
import type { StorageProvider, UploadResult } from './types'

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

export class LocalStorageProvider implements StorageProvider {
  async upload(pathname: string, buffer: Buffer): Promise<UploadResult> {
    const fullPath = path.join(UPLOADS_DIR, pathname)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, buffer)
    return { url: '/uploads/' + pathname.replace(/\\/g, '/'), pathname }
  }

  async delete(url: string): Promise<void> {
    const relative = url.replace(/^\/uploads\//, '')
    const fullPath = path.join(UPLOADS_DIR, relative)
    try { await fs.unlink(fullPath) } catch { /* already deleted */ }
  }
}
