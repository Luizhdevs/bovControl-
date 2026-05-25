import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CATEGORY_LABELS,
  SEX_LABELS,
  SEX_SYMBOL,
  PURPOSE_LABELS,
  STATUS_LABELS,
  LOT_TYPE_LABELS,
  PRIORITY_LABELS,
} from '@/modules/shared/domain/animal-labels'

// ─── Tipos ─────────────────────────────────────────────────

type BadgeSize = 'sm' | 'md' | 'lg'

function sizeClass(size: BadgeSize) {
  return {
    sm: 'text-[10px] px-1.5 py-0 h-5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  }[size]
}

// ─── Sexo ──────────────────────────────────────────────────

interface SexBadgeProps {
  sex:       'MALE' | 'FEMALE' | string
  size?:     BadgeSize
  showIcon?: boolean
}

export function SexBadge({ sex, size = 'md', showIcon = true }: SexBadgeProps) {
  const isFemale = sex === 'FEMALE'
  return (
    <Badge
      variant="outline"
      className={cn(
        sizeClass(size),
        isFemale
          ? 'border-pink-500/50 bg-pink-500/10 text-pink-400'
          : 'border-sky-500/50  bg-sky-500/10  text-sky-400',
      )}
    >
      {showIcon && <span className="mr-0.5">{SEX_SYMBOL[sex] ?? ''}</span>}
      {SEX_LABELS[sex] ?? sex}
    </Badge>
  )
}

// ─── Categoria ─────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  COW:    'border-purple-500/40 bg-purple-500/10 text-purple-400',
  HEIFER: 'border-blue-500/40   bg-blue-500/10   text-blue-400',
  CALF:   'border-green-500/40  bg-green-500/10  text-green-400',
  BULL:   'border-red-500/40    bg-red-500/10    text-red-400',
  STEER:  'border-amber-500/40  bg-amber-500/10  text-amber-400',
}

interface CategoryBadgeProps {
  category: string
  size?:    BadgeSize
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(sizeClass(size), CATEGORY_COLORS[category] ?? 'border-border')}
    >
      {CATEGORY_LABELS[category] ?? category}
    </Badge>
  )
}

// ─── Finalidade ────────────────────────────────────────────

const PURPOSE_COLORS: Record<string, string> = {
  DAIRY: 'border-cyan-500/40   bg-cyan-500/10   text-cyan-400',
  BEEF:  'border-orange-500/40 bg-orange-500/10 text-orange-400',
  BOTH:  'border-violet-500/40 bg-violet-500/10 text-violet-400',
}

interface PurposeBadgeProps {
  purpose: string
  size?:   BadgeSize
}

export function PurposeBadge({ purpose, size = 'md' }: PurposeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(sizeClass(size), PURPOSE_COLORS[purpose] ?? 'border-border')}
    >
      {PURPOSE_LABELS[purpose] ?? purpose}
    </Badge>
  )
}

// ─── Status do animal ──────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  SOLD:        'border-amber-500/40   bg-amber-500/10   text-amber-400',
  DEAD:        'border-red-500/40     bg-red-500/10     text-red-400',
  TRANSFERRED: 'border-blue-500/40   bg-blue-500/10    text-blue-400',
}

interface AnimalStatusBadgeProps {
  status: string
  size?:  BadgeSize
}

export function AnimalStatusBadge({ status, size = 'md' }: AnimalStatusBadgeProps) {
  if (status === 'ACTIVE') return null // Ativo é o padrão — não precisa de badge
  return (
    <Badge
      variant="outline"
      className={cn(sizeClass(size), STATUS_COLORS[status] ?? 'border-border')}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  )
}

// ─── Tipo de lote ──────────────────────────────────────────

const LOT_TYPE_COLORS: Record<string, string> = {
  LACTATING: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
  DRY:       'border-slate-500/40  bg-slate-500/10  text-slate-400',
  HEIFER:    'border-blue-500/40   bg-blue-500/10   text-blue-400',
  CALF:      'border-green-500/40  bg-green-500/10  text-green-400',
  FATTENING: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
  MIXED:     'border-border        bg-muted         text-muted-foreground',
}

interface LotTypeBadgeProps {
  type:  string
  size?: BadgeSize
}

export function LotTypeBadge({ type, size = 'md' }: LotTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(sizeClass(size), LOT_TYPE_COLORS[type] ?? 'border-border')}
    >
      {LOT_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

// ─── Prioridade de alerta ──────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'border-red-500/40    bg-red-500/10    text-red-400',
  MEDIUM: 'border-amber-500/40  bg-amber-500/10  text-amber-400',
  LOW:    'border-green-500/40  bg-green-500/10  text-green-400',
}

interface PriorityBadgeProps {
  priority: string
  size?:    BadgeSize
}

export function PriorityBadge({ priority, size = 'md' }: PriorityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(sizeClass(size), PRIORITY_COLORS[priority] ?? 'border-border')}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  )
}

// ─── Badge de inseminação ──────────────────────────────────

export function InseminationBadge({ size = 'md' }: { size?: BadgeSize }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        sizeClass(size),
        'border-teal-500/40 bg-teal-500/10 text-teal-400',
      )}
    >
      IA
    </Badge>
  )
}
