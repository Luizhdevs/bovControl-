import { z } from 'zod'

// ─── Tipo de ração ─────────────────────────────────────────────

export const feedTypeSchema = z.object({
  name:          z.string().min(1, 'Nome é obrigatório').max(100),
  brand:         z.string().max(100).optional().or(z.literal('')),
  weightPerBagKg: z
    .number({ required_error: 'Informe o peso por saco' })
    .positive('Peso deve ser positivo')
    .max(1000),
  pricePerBag:   z
    .number({ required_error: 'Informe o preço por saco' })
    .nonnegative('Preço não pode ser negativo')
    .max(99999),
  proteinPercent: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  active: z.boolean().default(true),
})

export type FeedTypeInput = z.infer<typeof feedTypeSchema>

// ─── Sessão de alimentação ─────────────────────────────────────

export const feedSessionSchema = z.object({
  lotId:      z.string().cuid('Lote inválido'),
  feedTypeId: z.string().cuid('Tipo de ração inválido'),
  bagCount:   z
    .number({ required_error: 'Informe o número de sacos' })
    .int('Número de sacos deve ser inteiro')
    .positive('Deve ser pelo menos 1 saco')
    .max(10000),
  date:  z.coerce.date().default(() => new Date()),
  notes: z.string().max(500).optional().or(z.literal('')),
})

export type FeedSessionInput = z.infer<typeof feedSessionSchema>

// ─── Filtros de listagem ───────────────────────────────────────

export const feedFiltersSchema = z.object({
  lotId:      z.string().cuid().optional(),
  feedTypeId: z.string().cuid().optional(),
  startDate:  z.coerce.date().optional(),
  endDate:    z.coerce.date().optional(),
})

export type FeedFiltersInput = z.infer<typeof feedFiltersSchema>
