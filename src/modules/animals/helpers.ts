/**
 * Helpers read-only do módulo de animais.
 * Nenhuma função aqui acessa o banco ou modifica dados.
 */

import type { AnimalWithRelations } from './types'
import type { VeterinaryAnimalSnapshot, VeterinaryReportGroup } from '@prisma/client'

const DAY_MS = 24 * 60 * 60 * 1000

// ─── Origem do animal ─────────────────────────────────────

export type AnimalOrigin = 'VETERINARY_IMPORTED' | 'MANUAL' | 'MIXED'

export const ANIMAL_ORIGIN_LABELS: Record<AnimalOrigin, string> = {
  VETERINARY_IMPORTED: 'Veterinário',
  MANUAL:              'Manual',
  MIXED:               'Misto',
}

export const ANIMAL_ORIGIN_DESCRIPTIONS: Record<AnimalOrigin, string> = {
  VETERINARY_IMPORTED: 'Importado via relatório veterinário',
  MANUAL:              'Cadastrado manualmente no sistema',
  MIXED:               'Cadastrado manualmente, vinculado ao relatório vet.',
}

/**
 * Determina a origem do cadastro do animal (sem acesso ao banco).
 * - VETERINARY_IMPORTED: tem externalCode (veio do import vet)
 * - MIXED: não tem externalCode mas tem snapshot vet (cadastro manual depois linkado)
 * - MANUAL: sem externalCode e sem snapshot vet
 */
export function getAnimalOrigin(
  animal:         Pick<AnimalWithRelations, 'externalCode'>,
  hasVetSnapshot: boolean,
): AnimalOrigin {
  if (animal.externalCode) return 'VETERINARY_IMPORTED'
  if (hasVetSnapshot)      return 'MIXED'
  return 'MANUAL'
}

// ─── Completude do cadastro ───────────────────────────────

export interface CompletenessStatus {
  isComplete: boolean
  missing:    string[]
}

/**
 * Verifica se o cadastro do animal está completo.
 * Não acessa banco — usa dados já carregados.
 */
export function getAnimalCompletenessStatus(
  animal:          AnimalWithRelations,
  photoCount:      number,
  hasReproduction: boolean,
): CompletenessStatus {
  const missing: string[] = []

  if (!animal.name)      missing.push('Nome')
  if (!animal.birthDate) missing.push('Data de nascimento')
  if (photoCount === 0)  missing.push('Foto')
  if (!animal.lotId)     missing.push('Lote')

  if (animal.category === 'CALF' && !animal.motherId) {
    missing.push('Registro da mãe')
  }

  if (['COW', 'HEIFER'].includes(animal.category) && animal.sex === 'FEMALE' && !hasReproduction) {
    missing.push('Histórico reprodutivo')
  }

  return { isComplete: missing.length === 0, missing }
}

// ─── Próximas ações ───────────────────────────────────────

export interface NextAction {
  title:    string
  reason:   string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  link?:    string
}

export type VetSnapshotForActions = Pick<
  VeterinaryAnimalSnapshot,
  | 'reportGroup'
  | 'expectedCalvingDate'
  | 'mastitisDays'
  | 'ccsThousand'
  | 'discardRecommendation'
>

/**
 * Calcula ações operacionais sugeridas para o animal.
 * Somente leitura — não cria alertas nem modifica dados.
 */
export function getNextActions(
  animal:      AnimalWithRelations,
  vetSnapshot: VetSnapshotForActions | null,
  today        = new Date(),
): NextAction[] {
  const actions: NextAction[] = []

  if (vetSnapshot) {
    const { reportGroup, expectedCalvingDate, mastitisDays, ccsThousand, discardRecommendation } = vetSnapshot

    if (reportGroup === 'CLOSE_UP') {
      actions.push({
        title:    'Acompanhar parto',
        reason:   'Vaca amojada – parto iminente',
        priority: 'HIGH',
      })
    }

    if (expectedCalvingDate) {
      const exp = new Date(expectedCalvingDate)
      const diffDays = Math.round((exp.getTime() - today.getTime()) / DAY_MS)
      if (diffDays < 0) {
        actions.push({
          title:    'Verificar parto vencido',
          reason:   `Parto previsto há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`,
          priority: 'HIGH',
        })
      } else if (diffDays <= 7) {
        actions.push({
          title:    `Parto em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`,
          reason:   `Previsto para ${exp.toLocaleDateString('pt-BR')}`,
          priority: 'HIGH',
        })
      }
    }

    if (reportGroup === 'TO_DRY') {
      actions.push({
        title:    'Secar vaca',
        reason:   'Recomendado secar neste ciclo',
        priority: 'HIGH',
      })
    }

    if (reportGroup === 'EMPTY_LATE') {
      actions.push({
        title:    'Revisar vaca vazia',
        reason:   'Vazia há mais de 45 dias sem nova inseminação',
        priority: 'MEDIUM',
      })
    }

    if (reportGroup === 'INSEMINATED_OVER_30D') {
      actions.push({
        title:    'Diagnóstico de gestação',
        reason:   'Mais de 30 dias desde a última inseminação',
        priority: 'MEDIUM',
      })
    }

    if (mastitisDays && mastitisDays > 0) {
      actions.push({
        title:    'Acompanhar mamite',
        reason:   `${mastitisDays} dia${mastitisDays !== 1 ? 's' : ''} de mamite registrados`,
        priority: 'HIGH',
      })
    }

    if (ccsThousand && ccsThousand >= 400) {
      actions.push({
        title:    'Revisar CCS elevado',
        reason:   `CCS: ${ccsThousand.toLocaleString('pt-BR')} ×1000`,
        priority: 'MEDIUM',
      })
    }

    if (discardRecommendation) {
      actions.push({
        title:    'Revisar descarte',
        reason:   discardRecommendation,
        priority: 'MEDIUM',
      })
    }
  }

  if (animal._count.photos === 0) {
    actions.push({
      title:    'Adicionar foto',
      reason:   'Sem foto registrada',
      priority: 'LOW',
    })
  }

  if (!animal.lotId) {
    actions.push({
      title:    'Definir lote',
      reason:   'Animal sem lote atribuído',
      priority: 'LOW',
    })
  }

  if (animal.category === 'CALF' && (!animal.name || !animal.birthDate)) {
    const parts: string[] = []
    if (!animal.name)      parts.push('nome')
    if (!animal.birthDate) parts.push('data de nascimento')
    actions.push({
      title:    'Completar cadastro',
      reason:   `Sem ${parts.join(' e ')}`,
      priority: 'LOW',
      link:     `/animals/${animal.id}/edit`,
    })
  }

  return actions
}

// ─── Status calculado por grupo veterinário ───────────────

const GROUP_STATUS_LABEL: Partial<Record<VeterinaryReportGroup, string>> = {
  CLOSE_UP:            'Amojada',
  TO_DRY:              'A secar',
  EMPTY_LATE:          'Vazia atrasada',
  DRY_EMPTY:           'Seca / Vazia',
  INSEMINATED_OVER_30D:'Diag. pendente',
  LACTATING_PREGNANT:  'Lactação gestante',
  DRY_PREGNANT:        'Seca gestante',
  EMPTY_NORMAL_45D:    'Vazia normal',
  PREGNANT_HEIFER:     'Novilha gestante',
}

export function getVetStatusLabel(group: VeterinaryReportGroup): string {
  return GROUP_STATUS_LABEL[group] ?? 'Sem status'
}

/** Calcula dias até o parto (negativo = atrasado) */
export function daysToCalving(expectedCalvingDate: Date | null, today = new Date()): number | null {
  if (!expectedCalvingDate) return null
  return Math.round((new Date(expectedCalvingDate).getTime() - today.getTime()) / DAY_MS)
}
