import { z } from 'zod'

export const createFarmSchema = z.object({
  name: z
    .string()
    .transform((v) => v.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100)),
  city:  z.string().max(100).optional().or(z.literal('')),
  state: z.string().length(2, 'Estado deve ter 2 letras').toUpperCase(),
})

export type CreateFarmInput = z.infer<typeof createFarmSchema>
