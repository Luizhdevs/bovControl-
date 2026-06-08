import { z } from 'zod'

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida (use #RRGGBB)')

export const earTagTemplateSchema = z.object({
  name:             z.string().min(1, 'Nome obrigatório').max(60, 'Máximo 60 caracteres'),
  widthMm:          z.coerce.number().min(15, 'Mínimo 15 mm').max(150, 'Máximo 150 mm'),
  heightMm:         z.coerce.number().min(10, 'Mínimo 10 mm').max(100, 'Máximo 100 mm'),
  paddingMm:        z.coerce.number().min(0).max(20).default(3),
  fontSizeMain:     z.coerce.number().min(6).max(36).int().default(14),
  fontSizeSecondary: z.coerce.number().min(4).max(24).int().default(9),
  qrSizeMm:         z.coerce.number().min(5, 'Mínimo 5 mm').max(50, 'Máximo 50 mm').default(18),
  showAnimalName:   z.boolean().default(false),
  showAnimalTag:    z.boolean().default(true),
  showFarmName:     z.boolean().default(false),
  showBorder:       z.boolean().default(true),
  orientation:      z.enum(['portrait', 'landscape']).default('landscape'),
  bgColor:          hexColor.default('#FFFFFF'),
  textColor:        hexColor.default('#000000'),
  layoutJson:       z.record(z.unknown()).default({}),
})

export type EarTagTemplateInput = z.infer<typeof earTagTemplateSchema>

export const printEarTagsSchema = z.object({
  templateId: z.string().min(1, 'Selecione um modelo'),
  animalIds:  z.array(z.string()).min(1, 'Selecione pelo menos 1 animal'),
  copies:     z.coerce.number().int().min(1).max(10).default(1),
})

export type PrintEarTagsInput = z.infer<typeof printEarTagsSchema>
