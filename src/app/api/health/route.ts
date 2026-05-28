import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'
import { STORAGE_PROVIDER_NAME } from '@/lib/storage/provider'

export const dynamic = 'force-dynamic'

export async function GET() {
  const timestamp = new Date().toISOString()

  // Database check
  let database: 'ok' | 'error' = 'error'
  try {
    await prisma.$queryRaw`SELECT 1`
    database = 'ok'
  } catch {
    database = 'error'
  }

  // Storage check
  let storage: 'ok' | 'unconfigured' | 'error' = 'ok'
  let storageError: string | undefined
  if (STORAGE_PROVIDER_NAME === 'r2') {
    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL']
    const missing  = required.filter((k) => !process.env[k])
    if (missing.length > 0) {
      storage = 'unconfigured'
      storageError = `missing: ${missing.join(', ')}`
    } else {
      try {
        const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3')
        const client = new S3Client({
          region:         'auto',
          endpoint:       `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          forcePathStyle: true,
          credentials: {
            accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
          },
        })
        await client.send(new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME!, MaxKeys: 1 }))
      } catch (e: unknown) {
        storage = 'error'
        storageError = (e as Error).message
      }
    }
  }

  const status = database === 'ok' && storage === 'ok' ? 'ok' : 'degraded'
  const code   = status === 'ok' ? 200 : 503

  return NextResponse.json(
    { status, database, storage: { provider: STORAGE_PROVIDER_NAME, status: storage, error: storageError }, timestamp },
    { status: code },
  )
}
