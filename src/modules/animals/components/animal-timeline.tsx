import Image from 'next/image'
import { formatDate, formatRelativeDate, cn } from '@/lib/utils'
import { getCategoryLabel } from '@/modules/shared/domain/animal-labels'
import { ImageIcon, Star } from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────

export type TimelinePhoto = {
  id:        string
  url:       string
  caption:   string | null
  takenAt:   Date
  isPrimary: boolean
}

export type TimelineContext = {
  category: string
  sex:      string
  lotName:  string | null
}

interface AnimalTimelineProps {
  photos:    TimelinePhoto[]
  context:   TimelineContext   // Contexto atual (category, lot, sex)
  animalTag: string
}

// ─── Item da timeline ──────────────────────────────────────

interface TimelineItemProps {
  photo:    TimelinePhoto
  context:  TimelineContext
  isFirst:  boolean
  isLast:   boolean
}

function TimelineItem({ photo, context, isFirst, isLast }: TimelineItemProps) {
  return (
    <div className="relative flex gap-3">
      {/* Linha vertical da timeline */}
      <div className="flex flex-col items-center shrink-0">
        {/* Ponto da timeline */}
        <div
          className={cn(
            'size-3 rounded-full border-2 mt-2 shrink-0 z-10',
            photo.isPrimary
              ? 'bg-primary border-primary'
              : 'bg-muted-foreground/30 border-muted-foreground/50',
          )}
        />
        {/* Linha conectora */}
        {!isLast && (
          <div className="w-px flex-1 bg-border/60 mt-1" />
        )}
      </div>

      {/* Conteúdo do item */}
      <div className="flex-1 pb-5">
        {/* Cabeçalho: data + indicadores */}
        <div className="flex items-center gap-2 mb-2">
          <time className="text-xs font-medium text-muted-foreground">
            {formatDate(photo.takenAt)}
          </time>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground/60">
            {formatRelativeDate(photo.takenAt)}
          </span>
          {photo.isPrimary && (
            <span className="ml-auto flex items-center gap-1 text-[10px] text-primary">
              <Star className="size-3" />
              Principal
            </span>
          )}
        </div>

        {/* Foto */}
        <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-2">
          <Image
            src={photo.url}
            alt={photo.caption ?? `Foto de ${formatDate(photo.takenAt)}`}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
        </div>

        {/* Contexto do momento */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-xs text-muted-foreground">
            {getCategoryLabel(context.category, context.sex)}
          </span>
          {context.lotName && (
            <>
              <span className="text-muted-foreground/40 text-xs">·</span>
              <span className="text-xs text-muted-foreground">
                {context.lotName}
              </span>
            </>
          )}
        </div>

        {/* Caption */}
        {photo.caption && (
          <p className="text-sm text-foreground/80 leading-snug italic">
            "{photo.caption}"
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Estado vazio ──────────────────────────────────────────

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center py-8 gap-3 text-center">
      <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
        <ImageIcon className="size-6 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">Nenhuma foto ainda</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Adicione fotos para construir a linha do tempo visual
        </p>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Timeline visual de fotos do animal.
 *
 * Exibe as fotos em ordem cronológica decrescente (mais recente primeiro).
 * Cada item mostra: data, foto, categoria/lote no contexto atual, caption.
 *
 * Futuramente: o context poderá ser histórico por data (quando houver
 * rastreamento de mudança de lote/categoria por foto).
 */
export function AnimalTimeline({ photos, context, animalTag }: AnimalTimelineProps) {
  if (photos.length === 0) {
    return <EmptyTimeline />
  }

  // Ordena decrescente (mais recente primeiro)
  const sorted = [...photos].sort(
    (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime(),
  )

  return (
    <div>
      {/* Contador */}
      <p className="text-xs text-muted-foreground mb-4">
        {sorted.length} {sorted.length === 1 ? 'registro' : 'registros'} fotográficos de{' '}
        <span className="font-mono font-medium">{animalTag}</span>
      </p>

      {/* Items da timeline */}
      <div>
        {sorted.map((photo, index) => (
          <TimelineItem
            key={photo.id}
            photo={photo}
            context={context}
            isFirst={index === 0}
            isLast={index === sorted.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
