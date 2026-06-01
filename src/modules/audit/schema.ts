import { z } from 'zod'

export const auditLogFiltersSchema = z.object({
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().cuid().optional(),
  period: z.enum(['today', '7d', '30d', '90d']).optional(),
  page:   z.coerce.number().int().positive().default(1),
})

export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>
