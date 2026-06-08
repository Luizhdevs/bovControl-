import type { EarTagTemplate } from '@prisma/client'

export type EarTagTemplateItem = EarTagTemplate

export type AnimalForEarTag = {
  id:       string
  tag:      string
  name:     string | null
  category: string
  sex:      string
  lot:      { name: string } | null
}

export type ActionResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// Posição do QR Code no template — armazenada em layoutJson.qrPosition
export type QrPosition = 'right' | 'left' | 'bottom'

export type LayoutJson = {
  qrPosition?: QrPosition
}

// Dados de exemplo para preview (animais fictícios)
export const PREVIEW_ANIMAL: AnimalForEarTag = {
  id:       'preview',
  tag:      'BOV-0042',
  name:     'Mimosa',
  category: 'COW',
  sex:      'FEMALE',
  lot:      { name: 'Lote Lactação 1' },
}

export const PREVIEW_FARM_NAME = 'Fazenda Exemplo'
