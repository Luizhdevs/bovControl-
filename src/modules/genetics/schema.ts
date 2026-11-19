import { z } from 'zod'

export const geneticProfileSchema = z.object({
  bullName:    z.string().min(2, 'Nome obrigatório'),
  externalCode:z.string().nullable().optional(),
  race:        z.string().nullable().optional(),
  labName:     z.string().nullable().optional(),

  // DEPs — todos opcionais
  depLeite:        z.number().nullable().optional(),
  depGordura:      z.number().nullable().optional(),
  depProteina:     z.number().nullable().optional(),
  depDesmame:      z.number().nullable().optional(),
  depSobreano:     z.number().nullable().optional(),
  depParto:        z.number().nullable().optional(),
  depCcs:          z.number().nullable().optional(),
  depTemperamento: z.number().nullable().optional(),
  depConformacao:  z.number().nullable().optional(),
  depFertilidade:  z.number().nullable().optional(),

  accLeite:   z.number().min(0).max(1).nullable().optional(),
  accDesmame: z.number().min(0).max(1).nullable().optional(),

  notes: z.string().nullable().optional(),
})

export type GeneticProfileInput = z.infer<typeof geneticProfileSchema>

export const breedingGoalSchema = z.object({
  wLeite:       z.number().int().min(0).max(100),
  wGanho:       z.number().int().min(0).max(100),
  wParto:       z.number().int().min(0).max(100),
  wCcs:         z.number().int().min(0).max(100),
  wConformacao: z.number().int().min(0).max(100),
})

export type BreedingGoalInput = z.infer<typeof breedingGoalSchema>
