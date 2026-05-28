import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { cn, calculateAge, CATEGORY_LABELS, SEX_LABELS, LOT_TYPE_LABELS } from '@/lib/utils'
import { MilkIcon, BeefIcon, Layers2Icon } from 'lucide-react'
import type { AnimalListItem } from '../types'

// ─── Cores por categoria ───────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  COW:    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  HEIFER: 'bg-blue-500/15  text-blue-400  border-blue-500/30',
  CALF:   'bg-green-500/15 text-green-400 border-green-500/30',
  BULL:   'bg-red-500/15   text-red-400   border-red-500/30',
  STEER:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const PURPOSE_ICONS = {
  DAIRY: MilkIcon,
  BEEF:  BeefIcon,
  BOTH:  Layers2Icon,
}

// ─── Componente ────────────────────────────────────────────

interface AnimalCardProps {
  animal: AnimalListItem
}

export function AnimalCard({ animal }: AnimalCardProps) {
  const age         = calculateAge(animal.birthDate)
  const categoryColor = CATEGORY_COLORS[animal.category] ?? ''
  const PurposeIcon   = PURPOSE_ICONS[animal.purpose]
  const initials      = animal.name?.[0]?.toUpperCase() ?? animal.tag.slice(-2)

  return (
    <Link
      href={`/animals/${animal.id}`}
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card',
        'transition-all duration-150',
        'active:scale-[0.98] hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        // Área mínima de toque para mobile
        'min-h-[120px]',
      )}
    >
      {/* Linha superior: foto + infos principais */}
      <div className="flex items-center gap-3 p-3">
        {/* Foto ou avatar */}
        <div className="relative shrink-0">
          {animal.primaryPhoto ? (
            <div className="relative size-14 rounded-lg overflow-hidden">
              <Image
                src={animal.primaryPhoto.thumbnailUrl ?? animal.primaryPhoto.url}
                alt={`Foto de ${animal.tag}`}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className={cn(
                'size-14 rounded-lg flex items-center justify-center',
                'bg-muted text-muted-foreground font-bold text-lg',
                animal.sex === 'FEMALE' ? 'bg-pink-500/10 text-pink-400' : 'bg-sky-500/10 text-sky-400',
              )}
            >
              {initials}
            </div>
          )}

          {/* Indicador de sexo */}
          <span
            className={cn(
              'absolute -bottom-1 -right-1 size-4 rounded-full text-[10px] font-bold',
              'flex items-center justify-center border-2 border-card',
              animal.sex === 'FEMALE'
                ? 'bg-pink-500 text-white'
                : 'bg-sky-500 text-white',
            )}
          >
            {animal.sex === 'FEMALE' ? '♀' : '♂'}
          </span>
        </div>

        {/* Informações */}
        <div className="min-w-0 flex-1">
          {/* Tag + nome */}
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-sm font-bold text-foreground">
              {animal.tag}
            </span>
            {animal.name && (
              <span className="text-sm text-muted-foreground truncate">
                · {animal.name}
              </span>
            )}
          </div>

          {/* Categoria + raça */}
          <div className="flex items-center gap-1.5 mt-1">
            <Badge
              variant="outline"
              className={cn('text-[11px] px-1.5 py-0 h-5', categoryColor)}
            >
              {CATEGORY_LABELS[animal.category]}
            </Badge>
            <span className="text-xs text-muted-foreground truncate">
              {animal.breed}
            </span>
          </div>

          {/* Idade + lote */}
          <div className="flex items-center gap-2 mt-1">
            {animal.birthDate && (
              <span className="text-xs text-muted-foreground">{age}</span>
            )}
            {animal.lot && (
              <>
                {animal.birthDate && (
                  <span className="text-muted-foreground/40 text-xs">·</span>
                )}
                <span
                  className={cn(
                    'text-xs truncate',
                    animal.lot.type === 'LACTATING'
                      ? 'text-purple-400'
                      : 'text-muted-foreground',
                  )}
                >
                  {animal.lot.name}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Ícone de finalidade */}
        <PurposeIcon className="size-4 shrink-0 text-muted-foreground/40" />
      </div>
    </Link>
  )
}
