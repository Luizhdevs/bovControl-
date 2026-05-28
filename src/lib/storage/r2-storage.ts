import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import type { StorageProvider, UploadResult } from './types'
import { getR2Env } from '@/lib/env'

export class R2StorageProvider implements StorageProvider {
  private client:    S3Client
  private bucket:    string
  private publicUrl: string

  constructor() {
    const env = getR2Env()

    this.bucket    = env.R2_BUCKET_NAME
    this.publicUrl = env.R2_PUBLIC_URL.replace(/\/$/, '')
    this.client    = new S3Client({
      region:         'auto',
      endpoint:       `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId:     env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  }

  async upload(pathname: string, buffer: Buffer, mimeType: string): Promise<UploadResult> {
    await this.client.send(new PutObjectCommand({
      Bucket:       this.bucket,
      Key:          pathname,
      Body:         buffer,
      ContentType:  mimeType,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    return { url: `${this.publicUrl}/${pathname}`, pathname }
  }

  async delete(url: string): Promise<void> {
    const key = url.startsWith(this.publicUrl + '/')
      ? url.slice(this.publicUrl.length + 1)
      : url
    try {
      await this.client.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key:    key,
      }))
    } catch { /* already deleted or not found */ }
  }
}
