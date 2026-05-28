import type { StorageProvider, UploadResult } from './types'

export const STORAGE_PROVIDER_NAME: 'local' | 'r2' =
  process.env.NODE_ENV === 'production' ? 'r2' : 'local'

let _provider: StorageProvider | null = null

async function getStorage(): Promise<StorageProvider> {
  if (_provider) return _provider
  if (STORAGE_PROVIDER_NAME === 'r2') {
    const { R2StorageProvider } = await import('./r2-storage')
    _provider = new R2StorageProvider()
  } else {
    const { LocalStorageProvider } = await import('./local-storage')
    _provider = new LocalStorageProvider()
  }
  return _provider
}

export async function uploadFile(
  pathname: string,
  buffer:   Buffer,
  mimeType: string,
): Promise<UploadResult> {
  return (await getStorage()).upload(pathname, buffer, mimeType)
}

export async function deleteFile(url: string): Promise<void> {
  return (await getStorage()).delete(url)
}
