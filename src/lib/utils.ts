import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  format,
  formatDistanceToNow,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const date  = new Date(birthDate)
  const today = new Date()

  const years = differenceInYears(today, date)
  if (years >= 2) {
    // 2 anos ou mais: exibe anos + meses restantes
    const afterYears = new Date(date)
    afterYears.setFullYear(afterYears.getFullYear() + years)
    const remMonths = differenceInMonths(today, afterYears)
    if (remMonths > 0) return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remMonths} ${remMonths === 1 ? 'mês' : 'meses'}`
    return `${years} ${years === 1 ? 'ano' : 'anos'}`
  }

  const totalMonths = differenceInMonths(today, date)
  if (totalMonths >= 1) {
    // Meses completos + dias restantes
    const afterMonths = new Date(date)
    afterMonths.setMonth(afterMonths.getMonth() + totalMonths)
    const remDays = differenceInDays(today, afterMonths)
    if (remDays > 0) return `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'} e ${remDays} ${remDays === 1 ? 'dia' : 'dias'}`
    return `${totalMonths} ${totalMonths === 1 ? 'mês' : 'meses'}`
  }

  // Menos de 1 mês: só dias
  const days = differenceInDays(today, date)
  return `${days} ${days === 1 ? 'dia' : 'dias'}`
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
