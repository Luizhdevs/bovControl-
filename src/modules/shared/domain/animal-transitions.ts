/**
 * Transições automáticas de categoria de animais.
 *
 * REGRAS CENTRALIZADAS — nenhum módulo implementa isso sozinho.
 *
 * IMPORTANTE: Este arquivo contém apenas FUNÇÕES PURAS.
 * Sem Prisma, sem side effects, sem imports externos.
 * As operações de banco ficam nos respectivos actions.ts dos módulos.
 *
 * Módulos que DEVEM usar estas funções:
 *  → animals/actions.ts   (transferir lote, criar animal)
 *  → milk/actions.ts      (registrar produção)
 *  → lots/actions.ts      (mover animais entre lotes)
 *  → alerts/actions.ts    (geração de alertas automáticos)
 */

// ─── Tipos mínimos ─────────────────────────────────────────

/** Shape mínimo do animal necessário para avaliar transições */
export type TransitionAnimal = {
  sex:      string
  category: string
}

/** Shape mínimo do lote necessário para avaliar tipo */
export type TransitionLot = {
  type: string
}

// ─── Verificações individuais ──────────────────────────────

/**
 * Verifica se um animal está apto a se tornar COW.
 * Condição: fêmea e ainda HEIFER.
 *
 * COW é irreversível — uma vez vaca, sempre vaca.
 */
export function canBecomeCow(animal: TransitionAnimal): boolean {
  return animal.sex === 'FEMALE' && animal.category === 'HEIFER'
}

/**
 * Verifica se um lote é do tipo LACTATING (curral de leite).
 * Lotes LACTATING são gatilhos automáticos de promoção HEIFER → COW.
 */
export function isLactatingLot(lot: TransitionLot | null | undefined): boolean {
  return lot?.type === 'LACTATING'
}

// ─── Regras de upgrade automático ─────────────────────────

/**
 * Determina se um animal deve ser promovido para COW ao entrar em um lote.
 *
 * Gatilho: lote do tipo LACTATING + animal fêmea HEIFER.
 *
 * Usado em:
 *  → animals/actions.ts → transferAnimalToLot()
 *  → animals/actions.ts → createAnimal() (quando lotId é informado)
 *  → lots/actions.ts → moveAnimalToLot()
 */
export function shouldUpgradeToCowByLot(
  animal: TransitionAnimal,
  targetLot: TransitionLot | null | undefined,
): boolean {
  return canBecomeCow(animal) && isLactatingLot(targetLot)
}

/**
 * Determina se um animal deve ser promovido para COW pelo registro de leite.
 *
 * Gatilho: qualquer registro de MilkRecord em fêmea HEIFER.
 * Regra: se ela produz leite, é vaca — independente do lote.
 *
 * Usado em:
 *  → milk/actions.ts → registerMilkRecord()
 */
export function shouldUpgradeToCowByMilkRecord(
  animal: TransitionAnimal,
): boolean {
  return canBecomeCow(animal)
}

// ─── Determinar nova categoria ─────────────────────────────

/**
 * Retorna a categoria final do animal após aplicar todas as regras de transição.
 * Se nenhuma transição se aplica, retorna a categoria atual.
 *
 * Uso: determina o valor de `category` antes de salvar no banco.
 *
 * @example
 * const newCategory = resolveAnimalCategory(animal, targetLot)
 * await prisma.animal.update({ data: { category: newCategory } })
 */
export function resolveAnimalCategory(
  animal: TransitionAnimal,
  context: { targetLot?: TransitionLot | null; hasMilkRecord?: boolean },
): TransitionAnimal['category'] {
  // Verifica upgrade por lote
  if (context.targetLot && shouldUpgradeToCowByLot(animal, context.targetLot)) {
    return 'COW'
  }

  // Verifica upgrade por registro de leite
  if (context.hasMilkRecord && shouldUpgradeToCowByMilkRecord(animal)) {
    return 'COW'
  }

  // Sem mudança
  return animal.category
}

// ─── Validações de categoria por sexo ─────────────────────

/**
 * Retorna as categorias válidas para um sexo.
 * Utilizado para validar formulários e seleções de UI.
 */
export function getValidCategoriesForSex(sex: string): string[] {
  if (sex === 'FEMALE') return ['CALF', 'HEIFER', 'COW']
  if (sex === 'MALE')   return ['CALF', 'BULL', 'STEER']
  return ['CALF', 'HEIFER', 'COW', 'BULL', 'STEER']
}

/**
 * Verifica se uma categoria é válida para um sexo específico.
 */
export function isCategoryValidForSex(category: string, sex: string): boolean {
  return getValidCategoriesForSex(sex).includes(category)
}
