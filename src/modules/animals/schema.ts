import { z } from 'zod'

// ─── Create ────────────────────────────────────────────────

/**
 * Campos obrigatórios no cadastro: sex, category, purpose.
 * Todo o resto é opcional para agilizar o input no curral.
 */
export const createAnimalSchema = z
  .object({
    sex:      z.enum(['MALE', 'FEMALE'], { required_error: 'Selecione o sexo' }),
    category: z.enum(['CALF', 'HEIFER', 'COW', 'BULL', 'STEER'], {
      required_error: 'Selecione a categoria',
    }),
    purpose:   z.enum(['DAIRY', 'BEEF', 'BOTH']).default('DAIRY'),
    name:      z.string().trim().max(60).optional().or(z.literal('')).transform(v => v || undefined),
    breed:     z.string().trim().max(60).default('Mestiço'),
    birthDate: z.coerce.date().optional().nullable(),
    birthType: z.enum(['NATURAL', 'INSEMINATION', 'EMBRYO_TRANSFER']).optional().nullable(),
    motherId:  z.string().cuid().optional().nullable(),
    fatherId:  z.string().cuid().optional().nullable(),
    lotId:     z.string().cuid().optional().nullable(),
    observations: z
      .string()
      .max(500, 'Máximo de 500 caracteres')
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    // Fêmeas não podem ser Touro ou Boi
    if (data.sex === 'FEMALE' && ['BULL', 'STEER'].includes(data.category)) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Fêmeas não podem ter categoria Touro ou Boi',
        path:    ['category'],
      })
    }
    // Machos não podem ser Novilha ou Vaca
    if (data.sex === 'MALE' && ['HEIFER', 'COW'].includes(data.category)) {
      ctx.addIssue({
        code:    z.ZodIssueCode.custom,
        message: 'Machos não podem ter categoria Novilha ou Vaca',
        path:    ['category'],
      })
    }
  })

export type CreateAnimalInput = z.infer<typeof createAnimalSchema>

// ─── Update ────────────────────────────────────────────────

export const updateAnimalSchema = z
  .object({
    sex:      z.enum(['MALE', 'FEMALE']).optional(),
    category: z.enum(['CALF', 'HEIFER', 'COW', 'BULL', 'STEER']).optional(),
    purpose:  z.enum(['DAIRY', 'BEEF', 'BOTH']).optional(),
    status:   z.enum(['ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED']).optional(),
    name:     z.string().trim().max(60).optional().or(z.literal('')).transform(v => v || undefined),
    breed:    z.string().trim().max(60).optional(),
    birthDate: z.coerce.date().optional().nullable(),
    birthType: z.enum(['NATURAL', 'INSEMINATION', 'EMBRYO_TRANSFER']).optional().nullable(),
    motherId:  z.string().cuid().optional().nullable(),
    fatherId:  z.string().cuid().optional().nullable(),
    lotId:     z.string().cuid().optional().nullable(),
    exitDate:  z.coerce.date().optional().nullable(),
    exitReason: z.string().max(200).optional().nullable(),
    observations: z.string().max(500).optional().nullable(),
  })

export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>

// ─── Transfer Lot ──────────────────────────────────────────

export const transferLotSchema = z.object({
  animalId: z.string().cuid('ID inválido'),
  lotId:    z.string().cuid('ID do lote inválido').nullable(),
})

export type TransferLotInput = z.infer<typeof transferLotSchema>

// ─── Upload de foto ────────────────────────────────────────

export const addPhotoSchema = z.object({
  animalId:     z.string().cuid('ID inválido'),
  url:          z.string().url('URL inválida'),
  thumbnailUrl: z.string().url('URL inválida').optional().nullable(),
  caption:      z.string().max(200).optional().nullable(),
  takenAt:      z.coerce.date().default(() => new Date()),
  isPrimary:    z.boolean().default(false),
  sizeKb:       z.number().int().min(0).default(0),
})

export type AddPhotoInput = z.infer<typeof addPhotoSchema>

// ─── Pesagem rápida ────────────────────────────────────────

export const addWeightSchema = z.object({
  animalId:  z.string().cuid('ID inválido'),
  weightKg:  z
    .number({ required_error: 'Informe o peso' })
    .positive('Peso deve ser positivo')
    .max(2000, 'Peso inválido'),
  measuredAt: z.coerce.date().default(() => new Date()),
  notes:      z.string().max(200).optional().nullable(),
})

export type AddWeightInput = z.infer<typeof addWeightSchema>

// ─── Filtros da listagem ───────────────────────────────────

export const animalFiltersSchema = z.object({
  search:    z.string().optional(),
  sex:       z.enum(['MALE', 'FEMALE']).optional(),
  category:  z.enum(['CALF', 'HEIFER', 'COW', 'BULL', 'STEER']).optional(),
  // 'ALL' = sem filtro de status (mostra todos). Default = 'ACTIVE' para novo acesso.
  status:    z.enum(['ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED', 'ALL']).default('ACTIVE'),
  purpose:   z.enum(['DAIRY', 'BEEF', 'BOTH']).optional(),
  lotId:     z.string().optional(),      // 'none' = animais sem lote
  pastureId: z.string().optional(),      // 'none' = lotes sem pasto
  // Faixa de idade em dias: '0-30' | '30-90' | '90-180' | '180-365' | '365-730' | '730+'
  agePreset: z.enum(['0-30', '30-90', '90-180', '180-365', '365-730', '730+']).optional(),
})

export type AnimalFiltersInput = z.infer<typeof animalFiltersSchema>

// ─── Registrar como Vendido ────────────────────────────────

export const markAnimalAsSoldSchema = z.object({
  animalId:  z.string().cuid('ID inválido'),
  exitDate:  z.coerce.date({ required_error: 'Informe a data de saída' }),
  saleValue: z.number().positive('Valor deve ser positivo').optional(),
  buyer:     z.string().trim().max(100).optional(),
  notes:     z.string().trim().max(300).optional(),
})

export type MarkAnimalAsSoldInput = z.infer<typeof markAnimalAsSoldSchema>

// ─── Registrar Óbito ───────────────────────────────────────

export const markAnimalAsDeadSchema = z.object({
  animalId: z.string().cuid('ID inválido'),
  exitDate: z.coerce.date({ required_error: 'Informe a data do óbito' }),
  cause:    z.string().trim().max(200).optional(),
})

export type MarkAnimalAsDeadInput = z.infer<typeof markAnimalAsDeadSchema>

// ─── Registrar Transferência ───────────────────────────────

export const markAnimalAsTransferredSchema = z.object({
  animalId:    z.string().cuid('ID inválido'),
  exitDate:    z.coerce.date({ required_error: 'Informe a data de transferência' }),
  destination: z.string().trim().max(100).optional(),
})

export type MarkAnimalAsTransferredInput = z.infer<typeof markAnimalAsTransferredSchema>

// ─── Reativar Animal ───────────────────────────────────────

export const reactivateAnimalSchema = z.object({
  animalId: z.string().cuid('ID inválido'),
})

export type ReactivateAnimalInput = z.infer<typeof reactivateAnimalSchema>

// ─── Registrar Parto ───────────────────────────────────────

export const calvingSchema = z.object({
  animalId:  z.string().cuid('ID inválido'),
  birthDate: z.coerce.date({ required_error: 'Informe a data do parto' }),
  calveSex:  z.enum(['MALE', 'FEMALE'], { required_error: 'Informe o sexo do bezerro' }),
  calveName: z.string().trim().max(60).optional(),
})

export type CalvingInput = z.infer<typeof calvingSchema>
