/**
 * Guards de domínio — validações de negócio antes de operações.
 *
 * REGRAS CENTRALIZADAS — nenhum módulo valida regras sozinho.
 *
 * IMPORTANTE: Funções puras. Sem Prisma, sem side effects.
 *
 * Retorno padronizado: GuardResult
 *  → { allowed: true }                 — operação permitida
 *  → { allowed: false; reason: string } — operação bloqueada + motivo amigável
 *
 * O campo `reason` é exibido diretamente na UI (toast, badge, tooltip).
 * Deve ser escrito em PT-BR, sem jargões técnicos.
 *
 * Módulos que DEVEM usar estas guards:
 *  → animals/actions.ts   (deactivateAnimal, transferAnimalToLot)
 *  → milk/actions.ts      (registerMilkRecord)
 *  → reproduction/actions.ts (registerReproduction)
 *  → lots/actions.ts      (moveAnimalToLot)
 */

// ─── Tipo de retorno ───────────────────────────────────────

export type GuardResult =
  | { allowed: true;  reason?: never }
  | { allowed: false; reason: string }

// ─── Tipo mínimo para guards ───────────────────────────────

export type GuardAnimal = {
  sex:       string
  category:  string
  status:    string
  birthType?: string | null
}

// ─── Guards de operações ───────────────────────────────────

/**
 * GUARD: Abate / Venda / Saída permanente
 *
 * Regras:
 * - Fêmea proveniente de inseminação NÃO pode ser abatida antes de virar vaca.
 *   Razão: preservar linhagem melhorada geneticamente.
 * - Animal já inativo não pode ser enviado ao abate novamente.
 */
export function canSendToSlaughter(animal: GuardAnimal): GuardResult {
  if (animal.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:  'Este animal já está inativo no sistema.',
    }
  }

  if (
    animal.sex       === 'FEMALE' &&
    animal.category  !== 'COW'    &&
    animal.birthType === 'INSEMINATION'
  ) {
    return {
      allowed: false,
      reason:
        'Fêmeas provenientes de inseminação artificial não podem ser abatidas antes de se tornarem vacas. Esta animal deve primeiro completar sua vida reprodutiva.',
    }
  }

  return { allowed: true }
}

/**
 * GUARD: Registro de produção de leite
 *
 * Regras:
 * - Somente fêmeas produzem leite.
 * - Animal deve estar ativo.
 * - Bezerras (CALF) não produzem leite comercialmente.
 */
export function canRegisterMilk(animal: GuardAnimal): GuardResult {
  if (animal.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:  'Somente animais ativos podem registrar produção.',
    }
  }

  if (animal.sex === 'MALE') {
    return {
      allowed: false,
      reason:  'Machos não registram produção de leite.',
    }
  }

  if (animal.category === 'CALF') {
    return {
      allowed: false,
      reason:  'Bezerras não registram produção de leite comercial.',
    }
  }

  return { allowed: true }
}

/**
 * GUARD: Transferência entre lotes
 *
 * Regras:
 * - Somente animais ativos podem ser transferidos.
 */
export function canMoveToLot(animal: GuardAnimal): GuardResult {
  if (animal.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:  'Somente animais ativos podem ser transferidos entre lotes.',
    }
  }

  return { allowed: true }
}

/**
 * GUARD: Registro de reprodução / inseminação
 *
 * Regras:
 * - Somente fêmeas têm registro reprodutivo.
 * - Animal deve estar ativo.
 * - Bezerras (CALF) não entram em programa reprodutivo.
 *
 * Nota: machos participam como "pai" no cadastro da fêmea, não como sujeito.
 */
export function canRegisterReproduction(animal: GuardAnimal): GuardResult {
  if (animal.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:  'Somente animais ativos podem registrar reprodução.',
    }
  }

  if (animal.sex === 'MALE') {
    return {
      allowed: false,
      reason:  'Machos são registrados como reprodutores no cadastro da fêmea, não como sujeito reprodutivo.',
    }
  }

  if (animal.category === 'CALF') {
    return {
      allowed: false,
      reason:  'Bezerras ainda não entram em programa reprodutivo.',
    }
  }

  return { allowed: true }
}

/**
 * GUARD: Registro de evento de saúde
 *
 * Regras:
 * - Qualquer animal ativo pode ter eventos de saúde registrados.
 * - Animais inativos não recebem novos eventos.
 */
export function canRegisterHealthEvent(animal: GuardAnimal): GuardResult {
  if (animal.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:  'Somente animais ativos podem ter eventos de saúde registrados.',
    }
  }

  return { allowed: true }
}

/**
 * GUARD: Registro de pesagem
 *
 * Regras:
 * - Qualquer animal ativo pode ser pesado.
 */
export function canRegisterWeight(animal: GuardAnimal): GuardResult {
  if (animal.status !== 'ACTIVE') {
    return {
      allowed: false,
      reason:  'Somente animais ativos podem registrar pesagem.',
    }
  }

  return { allowed: true }
}

/**
 * GUARD: Upload de foto
 *
 * Regras:
 * - Qualquer animal pode ter fotos (inclusive histórico pós-saída).
 */
export function canUploadPhoto(_animal: GuardAnimal): GuardResult {
  return { allowed: true }
}

// ─── Utility: verifica múltiplos guards de uma vez ─────────

/**
 * Retorna um mapa de resultados para todas as operações do animal.
 * Útil para popular o estado da UI de uma só vez.
 *
 * @example
 * const guards = getAnimalOperationGuards(animal)
 * <Button disabled={!guards.milk.allowed}>{guards.milk.reason}</Button>
 */
export function getAnimalOperationGuards(animal: GuardAnimal) {
  return {
    slaughter:    canSendToSlaughter(animal),
    milk:         canRegisterMilk(animal),
    lot:          canMoveToLot(animal),
    reproduction: canRegisterReproduction(animal),
    health:       canRegisterHealthEvent(animal),
    weight:       canRegisterWeight(animal),
    photo:        canUploadPhoto(animal),
  } as const
}

export type AnimalOperationGuards = ReturnType<typeof getAnimalOperationGuards>
