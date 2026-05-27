import { z } from 'zod'

// ─── Criação ───────────────────────────────────────────────

export const createHealthEventSchema = z.object({
  animalId:    z.string().cuid('Animal inválido'),
  type:        z.enum([
    'VACCINATION',
    'DISEASE',
    'DEWORMING',
    'EXAM',
    'MEDICATION',
    'OTHER',
  ], { required_error: 'Selecione o tipo' }),
  description: z.string().min(2, 'Descreva o evento').max(500, 'Máximo 500 caracteres'),
  medication:  z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
  // Aceita "12,50" (br) ou "12.50" (en) — converte antes de validar
  cost: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === '') return undefined
      if (typeof v === 'number') return v
      const n = parseFloat(String(v).replace(',', '.'))
      return isNaN(n) ? undefined : n
    },
    z.number().nonnegative('Custo não pode ser negativo').optional(),
  ),
  occurredAt:  z.coerce.date().default(() => new Date()),
  notes:       z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  resolved:    z.boolean().default(false),
})

export type CreateHealthEventInput = z.infer<typeof createHealthEventSchema>

// ─── Atualização (campos opcionais) ───────────────────────

export const updateHealthEventSchema = createHealthEventSchema
  .omit({ animalId: true })
  .partial()

export type UpdateHealthEventInput = z.infer<typeof updateHealthEventSchema>

// ─── Filtros de listagem ───────────────────────────────────

export const healthEventFiltersSchema = z.object({
  type:     z.enum(['VACCINATION', 'DISEASE', 'DEWORMING', 'EXAM', 'MEDICATION', 'OTHER']).optional(),
  animalId: z.string().cuid().optional(),
  resolved: z.enum(['true', 'false']).optional(),
  page:     z.coerce.number().int().positive().default(1),
})

export type HealthEventFiltersInput = z.infer<typeof healthEventFiltersSchema>
