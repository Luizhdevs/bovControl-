/**
 * Labels PT-BR de todos os enums do domínio animal.
 *
 * FONTE ÚNICA DE VERDADE para exibição no sistema.
 * Nenhum componente deve ter strings de label inline.
 *
 * Import direto: import { CATEGORY_LABELS } from '@/modules/shared/domain/animal-labels'
 * Import via utils (retrocompatível): import { CATEGORY_LABELS } from '@/lib/utils'
 */

// ─── Categorias por sexo ───────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  CALF:   'Bezerro(a)',
  HEIFER: 'Novilha',
  COW:    'Vaca',
  BULL:   'Touro',
  STEER:  'Boi',
}

/** Labels femininos (usados quando sexo já é conhecido) */
export const CATEGORY_LABELS_FEMALE: Record<string, string> = {
  CALF:   'Bezerra',
  HEIFER: 'Novilha',
  COW:    'Vaca',
}

/** Labels masculinos (usados quando sexo já é conhecido) */
export const CATEGORY_LABELS_MALE: Record<string, string> = {
  CALF:  'Bezerro',
  BULL:  'Touro',
  STEER: 'Boi',
}

/** Retorna o label correto de categoria considerando o sexo */
export function getCategoryLabel(category: string, sex?: string): string {
  if (sex === 'FEMALE' && CATEGORY_LABELS_FEMALE[category]) {
    return CATEGORY_LABELS_FEMALE[category]
  }
  if (sex === 'MALE' && CATEGORY_LABELS_MALE[category]) {
    return CATEGORY_LABELS_MALE[category]
  }
  return CATEGORY_LABELS[category] ?? category
}

// ─── Sexo ──────────────────────────────────────────────────

export const SEX_LABELS: Record<string, string> = {
  MALE:   'Macho',
  FEMALE: 'Fêmea',
}

export const SEX_SYMBOL: Record<string, string> = {
  MALE:   '♂',
  FEMALE: '♀',
}

// ─── Finalidade ────────────────────────────────────────────

export const PURPOSE_LABELS: Record<string, string> = {
  DAIRY: 'Leite',
  BEEF:  'Corte',
  BOTH:  'Misto',
}

// ─── Status do animal ──────────────────────────────────────

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE:      'Ativo',
  SOLD:        'Vendido',
  DEAD:        'Morto',
  TRANSFERRED: 'Transferido',
}

// ─── Tipo de lote ──────────────────────────────────────────

export const LOT_TYPE_LABELS: Record<string, string> = {
  LACTATING: 'Lactação',
  DRY:       'Seco',
  HEIFER:    'Novilhas',
  CALF:      'Bezerros',
  FATTENING: 'Engorda',
  MIXED:     'Misto',
}

// ─── Origem do animal ──────────────────────────────────────

export const BIRTH_TYPE_LABELS: Record<string, string> = {
  NATURAL:          'Natural',
  INSEMINATION:     'Inseminação Artificial',
  EMBRYO_TRANSFER:  'Transferência de Embrião',
}

// ─── Eventos de saúde ──────────────────────────────────────

export const HEALTH_EVENT_LABELS: Record<string, string> = {
  VACCINATION: 'Vacinação',
  DISEASE:     'Doença',
  DEWORMING:   'Vermifugação',
  EXAM:        'Exame',
  OTHER:       'Outro',
}

// ─── Turno de ordenha ──────────────────────────────────────

export const MILK_SHIFT_LABELS: Record<string, string> = {
  MORNING:   'Manhã',
  AFTERNOON: 'Tarde',
  EVENING:   'Noite',
}

// ─── Reprodução ────────────────────────────────────────────

export const REPRODUCTION_TYPE_LABELS: Record<string, string> = {
  INSEMINATION:   'Inseminação Artificial',
  NATURAL_MATING: 'Monta Natural',
  PREGNANCY_CHECK: 'Diagnóstico de Gestação',
}

export const REPRODUCTION_STATUS_LABELS: Record<string, string> = {
  PENDING:   'Aguardando',
  CONFIRMED: 'Confirmado',
  FAILED:    'Falhou',
}

// ─── Alertas ───────────────────────────────────────────────

export const ALERT_TYPE_LABELS: Record<string, string> = {
  HEAT:            'Cio',
  PREGNANCY_CHECK: 'Diagnóstico de Gestação',
  DRY_OFF:         'Secagem',
  CALVING:         'Parto Previsto',
  VACCINATION:     'Vacinação',
  WEIGHT_CHECK:    'Pesagem',
}

export const PRIORITY_LABELS: Record<string, string> = {
  HIGH:   'Alta',
  MEDIUM: 'Média',
  LOW:    'Baixa',
}

// ─── Roles ─────────────────────────────────────────────────

export const ROLE_LABELS: Record<string, string> = {
  OWNER:   'Proprietário',
  MANAGER: 'Gerente',
  WORKER:  'Funcionário',
  VIEWER:  'Visitante',
}
