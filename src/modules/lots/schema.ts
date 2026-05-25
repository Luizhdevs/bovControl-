import { z } from 'zod'

// ─── Constante de tipos (evita repetição) ─────────────────

const LOT_TYPES = [
  'LACTATING',
  'DRY',
  'HEIFER',
  'CALF',
  'FATTENING',
  'MIXED',
] as const

export type LotTypeValue = typeof LOT_TYPES[number]

// ─── Criar lote ────────────────────────────────────────────

/**
 * Campos obrigatórios: name, type.
 * maxCapacity e pastureId são opcionais para agilizar o cadastro.
 */
export const createLotSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(80, 'Máximo 80 caracteres')
    .trim(),
  type: z.enum(LOT_TYPES, {
    required_error: 'Selecione o tipo do lote',
  }),
  maxCapacity: z.coerce
    .number()
    .int('Capacidade deve ser número inteiro')
    .positive('Capacidade deve ser positiva')
    .max(9999, 'Capacidade muito alta')
    .optional()
    .nullable(),
  pastureId:    z.string().cuid('ID de pasto inválido').optional().nullable(),
  observations: z.string().max(500, 'Máximo 500 caracteres').optional().nullable(),
})

export type CreateLotInput = z.infer<typeof createLotSchema>

// ─── Editar lote ───────────────────────────────────────────

export const updateLotSchema = createLotSchema.partial()

export type UpdateLotInput = z.infer<typeof updateLotSchema>

// ─── Mover animal para lote ────────────────────────────────

/**
 * targetLotId = null → remove animal de qualquer lote (sem lote)
 * targetLotId = <id> → move animal para o lote especificado
 */
export const moveAnimalToLotSchema = z.object({
  animalId:    z.string().cuid('ID do animal inválido'),
  targetLotId: z.string().cuid('ID do lote inválido').nullable(),
})

export type MoveAnimalToLotInput = z.infer<typeof moveAnimalToLotSchema>

// ─── Filtros da listagem ───────────────────────────────────

export const lotFiltersSchema = z.object({
  search: z.string().optional(),
  type:   z.enum(LOT_TYPES).optional(),
})

export type LotFiltersInput = z.infer<typeof lotFiltersSchema>
