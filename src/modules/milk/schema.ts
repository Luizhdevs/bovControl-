import { z } from 'zod'

// ─── Sessão de ordenha (UI principal) ─────────────────────────

export const milkingSessionSchema = z.object({
  shift: z.enum(['MORNING', 'AFTERNOON'], {
    required_error: 'Selecione o turno',
  }),
  // Aceita Date ou string ISO/YYYY-MM-DD — coerce converte ambos
  date: z.coerce.date().default(() => new Date()),
  totalLiters: z
    .number({ required_error: 'Informe a produção total em litros' })
    .positive('Produção deve ser positiva')
    .max(10000, 'Valor muito alto — verifique o dado'),
  milkingCows: z
    .number({ required_error: 'Informe o número de vacas ordenhadas' })
    .int('Número de vacas deve ser inteiro')
    .positive('Deve haver pelo menos 1 vaca')
    .max(10000, 'Número de vacas inválido'),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  // Chave de idempotência gerada pelo cliente para deduplicação offline
  idempotencyKey: z.string().uuid().optional(),
})

export type MilkingSessionInput = z.infer<typeof milkingSessionSchema>

// ─── Registro individual (legado / Fase 2) ────────────────────
// Mantido para backward-compat com /milk/[animalId] e phase 2.

export const milkRecordSchema = z.object({
  animalId:   z.string().cuid('ID inválido'),
  liters:     z
    .number({ required_error: 'Informe a produção em litros' })
    .positive('Produção deve ser positiva')
    .max(100, 'Produção muito alta — verifique o valor')
    .multipleOf(0.1),
  shift:      z.enum(['MORNING', 'AFTERNOON'], {
    required_error: 'Selecione o turno',
  }),
  recordedAt:     z.coerce.date().default(() => new Date()),
  idempotencyKey: z.string().uuid().optional(),
})

export type MilkRecordInput = z.infer<typeof milkRecordSchema>

// ─── Filtros de listagem ───────────────────────────────────────

export const milkFiltersSchema = z.object({
  animalId:  z.string().cuid().optional(),
  lotId:     z.string().cuid().optional(),
  shift:     z.enum(['MORNING', 'AFTERNOON']).optional(),
  startDate: z.coerce.date().optional(),
  endDate:   z.coerce.date().optional(),
})

export type MilkFiltersInput = z.infer<typeof milkFiltersSchema>
