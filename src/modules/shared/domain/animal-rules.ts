/**
 * Ponto de entrada único do domínio de animais.
 *
 * IMPORT RECOMENDADO para módulos que precisam de regras de animais:
 *   import { canRegisterMilk, shouldUpgradeToCowByLot } from '@/modules/shared/domain/animal-rules'
 *
 * Evita que módulos importem de arquivos individuais de domínio —
 * centralizando mudanças em um único ponto de entrada.
 */

// Transições automáticas de categoria
export {
  canBecomeCow,
  isLactatingLot,
  shouldUpgradeToCowByLot,
  shouldUpgradeToCowByMilkRecord,
  resolveAnimalCategory,
  getValidCategoriesForSex,
  isCategoryValidForSex,
  type TransitionAnimal,
  type TransitionLot,
} from './animal-transitions'

// Guards de operações (validações de negócio)
export {
  canSendToSlaughter,
  canRegisterMilk,
  canMoveToLot,
  canRegisterReproduction,
  canRegisterHealthEvent,
  canRegisterWeight,
  canUploadPhoto,
  getAnimalOperationGuards,
  type GuardResult,
  type GuardAnimal,
  type AnimalOperationGuards,
} from './animal-guards'

// Labels PT-BR do domínio
export {
  CATEGORY_LABELS,
  CATEGORY_LABELS_FEMALE,
  CATEGORY_LABELS_MALE,
  getCategoryLabel,
  SEX_LABELS,
  SEX_SYMBOL,
  PURPOSE_LABELS,
  STATUS_LABELS,
  LOT_TYPE_LABELS,
  MILK_STATUS_LABELS,
  BIRTH_TYPE_LABELS,
  HEALTH_EVENT_LABELS,
  MILK_SHIFT_LABELS,
  REPRODUCTION_TYPE_LABELS,
  REPRODUCTION_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  PRIORITY_LABELS,
  ROLE_LABELS,
} from './animal-labels'
