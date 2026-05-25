import { z } from 'zod'

// ─── Registro de produção ──────────────────────────────────

export const milkRecordSchema = z.object({
  animalId:   z.string().cuid('ID inválido'),
  liters:     z
    .number({ required_error: 'Informe a produção em litros' })
    .positive('Produção deve ser positiva')
    .max(100, 'Produção muito alta — verifique o valor')
    .multipleOf(0.1),
  shift:      z.enum(['MORNING', 'AFTERNOON', 'EVENING'], {
    required_error: 'Selecione o turno',
  }),
  recordedAt: z.coerce.date().default(() => new Date()),
})

export type MilkRecordInput = z.infer<typeof milkRecordSchema>

// ─── Filtros de listagem ───────────────────────────────────

export const milkFiltersSchema = z.object({
  animalId:  z.string().cuid().optional(),
  lotId:     z.string().cuid().optional(),
  shift:     z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  startDate: z.coerce.date().optional(),
  endDate:   z.coerce.date().optional(),
})

export type MilkFiltersInput = z.infer<typeof milkFiltersSchema>

// ─── Resumo diário ─────────────────────────────────────────

export const dailySummarySchema = z.object({
  farmId: z.string().cuid(),
  date:   z.coerce.date().default(() => new Date()),
})

export type DailySummaryInput = z.infer<typeof dailySummarySchema>
