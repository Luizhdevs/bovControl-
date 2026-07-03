import { z } from 'zod'

// ─── Filtros de listagem de relatórios ────────────────────

export const veterinaryReportFiltersSchema = z.object({
  sourceSystem: z.enum(['PRODAP', 'ZIL', 'MANUAL', 'CSV', 'OTHER']).optional(),
  importStatus: z.enum(['DRAFT', 'IMPORTED', 'PARTIALLY_IMPORTED', 'FAILED']).optional(),
  page:         z.coerce.number().int().positive().default(1),
  pageSize:     z.coerce.number().int().positive().max(100).default(20),
})

export type VeterinaryReportFiltersInput = z.infer<typeof veterinaryReportFiltersSchema>

// ─── Criação manual de relatório (sem arquivo) ────────────
// Usado para importação manual ou CSV (Fase 1).

export const createVeterinaryReportSchema = z.object({
  reportDate:       z.coerce.date({ required_error: 'Informe a data do relatório' }),
  sourceSystem:     z.enum(['PRODAP', 'ZIL', 'MANUAL', 'CSV', 'OTHER']).default('PRODAP'),
  technicianName:   z.string().trim().max(100).optional().nullable(),
  externalFarmName: z.string().trim().max(100).optional().nullable(),
  externalOwnerName:z.string().trim().max(100).optional().nullable(),
  originalFilename: z.string().max(255).optional().nullable(),
  originalFileUrl:  z.string().url().optional().nullable(),
})

export type CreateVeterinaryReportInput = z.infer<typeof createVeterinaryReportSchema>

// ─── Schema de uma linha do relatório (snapshot) ──────────
// Usado no parse do CSV e na importação manual.

export const veterinarySnapshotRowSchema = z.object({
  externalCode:       z.string().trim().max(50).optional().nullable(),
  animalName:         z.string().trim().max(100).optional().nullable(),
  rawGroupLabel:      z.string().trim().max(200).optional().nullable(),
  parityNumber:       z.coerce.number().int().nonnegative().optional().nullable(),
  lastCalvingDate:    z.coerce.date().optional().nullable(),
  rp:                 z.string().trim().max(20).optional().nullable(),
  sx:                 z.string().trim().max(20).optional().nullable(),
  inseminationDate:   z.coerce.date().optional().nullable(),
  inseminationNumber: z.coerce.number().int().positive().max(10).optional().nullable(),
  reportDays:         z.coerce.number().int().nonnegative().max(999).optional().nullable(),
  bullName:           z.string().trim().max(100).optional().nullable(),
  expectedCalvingDate:z.coerce.date().optional().nullable(),
  milkPeak:           z.coerce.number().nonnegative().optional().nullable(),
  milkCurrent:        z.coerce.number().nonnegative().optional().nullable(),
  breed:              z.string().trim().max(60).optional().nullable(),
  fatherName:         z.string().trim().max(100).optional().nullable(),
  cScore:             z.coerce.number().min(1).max(5).optional().nullable(),
  tScore:             z.coerce.number().min(1).max(5).optional().nullable(),
  occurrence:         z.string().trim().max(500).optional().nullable(),
  discardRecommendation: z.string().trim().max(200).optional().nullable(),
  mastitisDays:       z.coerce.number().int().nonnegative().optional().nullable(),
  ccsThousand:        z.coerce.number().nonnegative().optional().nullable(),
  isCloseUp:          z.boolean().default(false),
})

export type VeterinarySnapshotRowInput = z.infer<typeof veterinarySnapshotRowSchema>

// ─── Schema de vínculo manual animal ↔ snapshot ──────────

export const linkSnapshotSchema = z.object({
  snapshotId: z.string().cuid('ID inválido'),
  animalId:   z.string().cuid('ID inválido').nullable(),
})

export type LinkSnapshotInput = z.infer<typeof linkSnapshotSchema>
