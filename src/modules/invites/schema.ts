import { z } from 'zod'

export const createInviteSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase(),
  role:  z.enum(['MANAGER', 'WORKER', 'VIEWER']).default('WORKER'),
})

export type CreateInviteInput = z.infer<typeof createInviteSchema>
