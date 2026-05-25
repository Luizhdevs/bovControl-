import { z } from 'zod'

// ─── Registro de evento reprodutivo ───────────────────────

export const reproductionSchema = z.object({
  animalId: z.string().cuid('ID inválido'),

  type: z.enum(['INSEMINATION', 'NATURAL_MATING', 'PREGNANCY_CHECK'], {
    required_error: 'Selecione o tipo de evento',
  }),

  date: z.coerce.date({
    required_error: 'Informe a data do evento',
  }),

  // Nome do touro (monta natural) ou ID do sêmen (IA)
  bullName: z.string().max(100, 'Máximo 100 caracteres').optional().nullable(),

  status: z
    .enum(['PENDING', 'CONFIRMED', 'FAILED'])
    .default('PENDING'),

  // Data sugerida para diagnóstico de gestação (IA/monta)
  // OU previsão de parto (quando prenhez confirmada)
  nextCheckDate: z.coerce.date().optional().nullable(),

  result: z.string().max(500).optional().nullable(),

  notes: z.string().max(1000, 'Máximo 1000 caracteres').optional().nullable(),
})

export type ReproductionInput = z.infer<typeof reproductionSchema>

// ─── Atualização de status ─────────────────────────────────

export const updateReproductionStatusSchema = z.object({
  recordId:     z.string().cuid('ID inválido'),
  status:       z.enum(['PENDING', 'CONFIRMED', 'FAILED']),
  nextCheckDate: z.coerce.date().optional().nullable(),
})

export type UpdateReproductionStatusInput = z.infer<typeof updateReproductionStatusSchema>

// ─── Filtros de listagem ───────────────────────────────────

export const reproductionFiltersSchema = z.object({
  type:     z.enum(['INSEMINATION', 'NATURAL_MATING', 'PREGNANCY_CHECK']).optional(),
  status:   z.enum(['PENDING', 'CONFIRMED', 'FAILED']).optional(),
  animalId: z.string().cuid().optional(),
  days:     z.coerce.number().min(7).max(365).default(30),
})

export type ReproductionFiltersInput = z.infer<typeof reproductionFiltersSchema>
