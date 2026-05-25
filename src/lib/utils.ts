import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format,
  formatDistanceToNow,
  differenceInMonths,
  differenceInYears,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { prisma } from './prisma'

// ─── Tailwind ──────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Formatadores de data ──────────────────────────────────

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export function formatMonth(date: Date | string | null | undefined): string {
  if (!date) return '—'
  return format(new Date(date), "MMMM 'de' yyyy", { locale: ptBR })
}

export function calculateAge(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return '—'
  const date = new Date(birthDate)
  const years = differenceInYears(new Date(), date)
  if (years >= 1) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  const months = differenceInMonths(new Date(), date)
  if (months >= 1) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  return '< 1 mês'
}

// ─── Formatadores de valor ─────────────────────────────────

export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—'
  return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`
}

export function formatLiters(liters: number | null | undefined): string {
  if (liters == null) return '—'
  return `${liters.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Geração de tag do animal ──────────────────────────────

/**
 * Gera o próximo tag disponível para a fazenda no formato BOV-XXXX.
 * MVP: sem lock de concorrência. Produção → usar sequence no banco.
 */
export async function generateAnimalTag(farmId: string): Promise<string> {
  const animals = await prisma.animal.findMany({
    where:  { farmId },
    select: { tag: true },
  })

  const maxNum = animals.reduce((max, animal) => {
    const match = animal.tag.match(/(\d+)$/)
    const num = match ? parseInt(match[1]!, 10) : 0
    return Math.max(max, num)
  }, 0)

  return `BOV-${String(maxNum + 1).padStart(4, '0')}`
}

// ─── Re-exports de labels do domínio (retrocompatibilidade) ─
// Novos módulos devem importar direto de @/modules/shared/domain/animal-rules

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
  BIRTH_TYPE_LABELS,
  HEALTH_EVENT_LABELS,
  MILK_SHIFT_LABELS,
} from '@/modules/shared/domain/animal-labels'
