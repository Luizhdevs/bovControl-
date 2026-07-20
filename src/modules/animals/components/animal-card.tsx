'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { cn, calculateAge, formatDate, CATEGORY_LABELS, LOT_TYPE_LABELS } from '@/lib/utils'
import { MilkIcon, BeefIcon, Layers2Icon, Check, Stethoscope } from 'lucide-react'
import type { AnimalListItem } from '../types'

// ─── Constantes ────────────────────────────────────────────

export const DESKTOP_COLS =
  '[grid-template-columns:36px_96px_minmax(160px,1fr)_96px_110px_140px_20px]'

const CATEGORY_COLORS: Record<string, string> = {
  COW:    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  HEIFER: 'bg-blue-500/15  text-blue-400  border-blue-500/30',
  CALF:   'bg-green-500/15 text-green-400 border-green-500/30',
  BULL:   'bg-red-500/15   text-red-400   border-red-500/30',
  STEER:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const LOT_TYPE_COLOR: Record<string, string> = {
  LACTATING: 'text-purple-400',
}

const PURPOSE_ICONS = {
  DAIRY: MilkIcon,
  BEEF:  BeefIcon,
  BOTH:  Layers2Icon,
}

// ─── Checkbox customizado ──────────────────────────────────

function AnimalCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <div
      role="checkbox"
      aria-checked={checked}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onChange() }}
      className={cn(
        'size-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors',
        checked
          ? 'bg-primary border-primary'
          : 'border-muted-foreground/40 bg-background hover:border-primary/60',
      )}
    >
      {checked && <Check className="size-2.5 text-primary-foreground stroke-[3]" />}
    </div>
  )
}

// ─── Avatar compartilhado ──────────────────────────────────

function AnimalAvatar({ animal, size }: { animal: AnimalListItem; size: 'sm' | 'md' }) {
  const initials = animal.name?.[0]?.toUpperCase() ?? animal.tag.slice(-2)
  const dim = size === 'md' ? 'size-14' : 'size-10'

  return (
    <div className="relative shrink-0">
      {animal.primaryPhoto ? (
        <div className={cn('relative rounded-lg overflow-hidden', dim)}>
          <Image
            src={animal.primaryPhoto.thumbnailUrl ?? animal.primaryPhoto.url}
            alt={animal.tag}
            fill
            sizes={size === 'md' ? '56px' : '40px'}
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className={cn(
            'rounded-lg flex items-center justify-center font-bold',
            dim,
            size === 'md' ? 'text-lg' : 'text-sm',
            animal.sex === 'FEMALE'
              ? 'bg-pink-500/10 text-pink-400'
              : 'bg-sky-500/10 text-sky-400',
          )}
        >
          {initials}
        </div>
      )}
      <span
        className={cn(
          'absolute -bottom-1 -right-1 rounded-full font-bold flex items-center justify-center border-2 border-card',
          size === 'md' ? 'size-4 text-[10px]' : 'size-3.5 text-[9px]',
          animal.sex === 'FEMALE' ? 'bg-pink-500 text-white' : 'bg-sky-500 text-white',
        )}
      >
        {animal.sex === 'FEMALE' ? '♀' : '♂'}
      </span>
    </div>
  )
}

// ─── Componente ────────────────────────────────────────────

interface AnimalCardProps {
  animal:        AnimalListItem
  isSelected?:   boolean
  onSelect?:     () => void
  showCheckbox?: boolean
}

export function AnimalCard({ animal, isSelected = false, onSelect, showCheckbox = false }: AnimalCardProps) {
  const age           = calculateAge(animal.birthDate)
  const categoryColor = CATEGORY_COLORS[animal.category] ?? ''
  const PurposeIcon   = PURPOSE_ICONS[animal.purpose]
  const lotColor      = LOT_TYPE_COLOR[animal.lot?.type ?? ''] ?? 'text-muted-foreground'

  return (
    <>
      {/* ── MOBILE (< md) — card compacto ─────────────────── */}
      <div
        className={cn(
          'md:hidden flex items-center gap-3 p-3',
          'rounded-xl border border-border bg-card',
          'min-h-[88px] transition-all duration-150',
          isSelected
            ? 'border-primary/60 bg-primary/5'
            : 'hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
          showCheckbox && 'cursor-pointer',
        )}
        onClick={showCheckbox ? () => onSelect?.() : undefined}
      >
        {/* Checkbox mobile — só no modo de seleção */}
        {showCheckbox && onSelect && (
          <AnimalCheckbox checked={isSelected} onChange={onSelect} />
        )}

        <Link
          href={`/animals/${animal.id}`}
          className="flex items-center gap-3 flex-1 min-w-0"
          onClick={showCheckbox ? e => e.preventDefault() : undefined}
        >
          <AnimalAvatar animal={animal} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-sm font-bold text-foreground">{animal.tag}</span>
              {animal.name && (
                <span className="text-sm text-muted-foreground truncate">· {animal.name}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="outline" className={cn('text-[11px] px-1.5 py-0 h-5', categoryColor)}>
                {CATEGORY_LABELS[animal.category]}
              </Badge>
              <span className="text-xs text-muted-foreground truncate">{animal.breed}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {animal.birthDate && (
                <span className="text-xs text-muted-foreground">{age}</span>
              )}
              {animal.lot && (
                <>
                  {animal.birthDate && <span className="text-muted-foreground/40 text-xs">·</span>}
                  <span className={cn('text-xs truncate', lotColor)}>{animal.lot.name}</span>
                </>
              )}
              {animal.lastVeterinaryReportAt && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-cyan-500/80">
                    <Stethoscope className="size-3" />
                    {formatDate(animal.lastVeterinaryReportAt)}
                  </span>
                </>
              )}
            </div>
          </div>

          <PurposeIcon className="size-4 shrink-0 text-muted-foreground/40" />
        </Link>
      </div>

      {/* ── DESKTOP (md+) — linha de tabela ───────────────── */}
      <div className={cn(
        'hidden md:flex items-center transition-all duration-150',
        isSelected ? 'bg-primary/5' : 'hover:bg-primary/5',
      )}>
        {/* Checkbox — só no modo de seleção */}
        {showCheckbox ? (
          <div
            className="w-10 flex-none flex items-center justify-center py-3 cursor-pointer"
            onClick={() => onSelect?.()}
          >
            <AnimalCheckbox checked={isSelected} onChange={() => onSelect?.()} />
          </div>
        ) : (
          /* Espaço reservado sem checkbox para manter alinhamento com o header */
          <div className="w-10 flex-none" />
        )}

        {/* Conteúdo — link ocupa o restante */}
        <Link
          href={`/animals/${animal.id}`}
          className={cn('flex-1 grid items-center gap-3 pr-4 py-3', DESKTOP_COLS)}
        >
          <AnimalAvatar animal={animal} size="sm" />

          <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
            {animal.tag}
          </span>

          <span className="text-sm text-foreground font-medium truncate">
            {animal.name ?? <span className="text-muted-foreground italic text-xs">sem nome</span>}
          </span>

          <div>
            <Badge variant="outline" className={cn('text-[11px] px-2 py-0 h-5', categoryColor)}>
              {CATEGORY_LABELS[animal.category]}
            </Badge>
          </div>

          <span className="text-xs text-muted-foreground truncate">{animal.breed}</span>

          <div className="min-w-0">
            <span className={cn('text-xs truncate block', animal.lot ? lotColor : 'text-muted-foreground/40')}>
              {animal.lot?.name ?? '—'}
            </span>
            {animal.lastVeterinaryReportAt && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-cyan-500/80 mt-0.5">
                <Stethoscope className="size-2.5" />
                {formatDate(animal.lastVeterinaryReportAt)}
              </span>
            )}
          </div>

          <PurposeIcon className="size-4 text-muted-foreground/40 justify-self-end" />
        </Link>
      </div>
    </>
  )
}
