export type UploadResult = {
  url:      string
  pathname: string
}

export interface StorageProvider {
  upload(pathname: string, buffer: Buffer, mimeType: string): Promise<UploadResult>
  delete(url: string): Promise<void>
}
