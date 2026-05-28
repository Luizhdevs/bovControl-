import { z } from 'zod'

const r2Schema = z.object({
  R2_ACCOUNT_ID:        z.string().min(1),
  R2_ACCESS_KEY_ID:     z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME:       z.string().min(1),
  R2_PUBLIC_URL:        z.string().url(),
})

export type R2Env = z.infer<typeof r2Schema>

export function getR2Env(): R2Env {
  const result = r2Schema.safeParse(process.env)
  if (!result.success) {
    throw new Error(
      'Missing or invalid R2 environment variables:\n' +
      result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n'),
    )
  }
  return result.data
}
