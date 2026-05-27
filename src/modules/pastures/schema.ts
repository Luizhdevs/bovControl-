import { z } from 'zod'

export const createPastureSchema = z.object({
  name:         z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo').trim(),
  areaHectares: z
    .number({ invalid_type_error: 'Informe a área em hectares' })
    .positive('Área deve ser positiva')
    .max(99999, 'Área inválida')
    .optional()
    .nullable(),
  grassType:    z
    .string()
    .max(60, 'Tipo de capim muito longo')
    .trim()
    .optional()
    .nullable()
    .transform((v) => v || null),
  maxCapacity:  z
    .number({ invalid_type_error: 'Informe a capacidade' })
    .int('Capacidade deve ser um número inteiro')
    .positive('Capacidade deve ser positiva')
    .max(99999, 'Capacidade inválida')
    .optional()
    .nullable(),
})

export const updatePastureSchema = createPastureSchema.partial()

export type CreatePastureInput = z.infer<typeof createPastureSchema>
export type UpdatePastureInput = z.infer<typeof updatePastureSchema>
