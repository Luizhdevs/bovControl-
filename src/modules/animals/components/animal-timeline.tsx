'use client'

import { useState }  from 'react'
import Image         from 'next/image'
import { formatDate, cn } from '@/lib/utils'
import { ImageIcon, Expand, Star, Trash2 } from 'lucide-react'
import { PhotoDeleteButton } from './photo-delete-button'
import { SetPrimaryButton }  from './set-primary-button'
import { PhotoLightbox, type LightboxPhoto } from './photo-lightbox'

// ─── Tipos ─────────────────────────────────────────────────

export type TimelinePhoto = {
  id:           string
  url:          string
  thumbnailUrl: string | null
  caption:      string | null
  takenAt:      Date
  isPrimary:    boolean
}

export type TimelineContext = {
  category: string
  sex:      string
  lotName:  string | null
}

interface AnimalTimelineProps {
  photos:    TimelinePhoto[]
  context:   TimelineContext
  animalTag: string
  farmId:    string
  canDelete: boolean
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
          Adicione fotos para construir o histórico visual
        </p>
      </div>
    </div>
  )
}

// ─── Card de foto individual ────────────────────────────────

interface PhotoCardProps {
  photo:      TimelinePhoto
  index:      number
  farmId:     string
  canDelete:  boolean
  onOpen:     () => void
  large?:     boolean
}

function PhotoCard({ photo, farmId, canDelete, onOpen, large }: PhotoCardProps) {
  const src = photo.thumbnailUrl ?? photo.url

  return (
    <div className="group relative flex flex-col gap-1.5">
      {/* Imagem clicável */}
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'relative w-full overflow-hidden rounded-xl bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-zoom-in',
          large ? 'aspect-[4/3]' : 'aspect-[4/3]',
        )}
      >
        <Image
          src={src}
          alt={photo.caption ?? `Foto de ${formatDate(photo.takenAt)}`}
          fill
          sizes={large
            ? '(max-width: 640px) 100vw, 600px'
            : '(max-width: 640px) 50vw, 200px'}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {/* Overlay expand */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity size-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Expand className="size-4 text-white" />
          </div>
        </div>

        {/* Badge principal — canto superior esquerdo */}
        {photo.isPrimary && (
          <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            <Star className="size-2.5 fill-white" />
            Principal
          </div>
        )}
      </button>

      {/* Rodapé do card */}
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {formatDate(photo.takenAt)}
          </p>
          {photo.caption && (
            <p className="text-xs text-foreground/70 italic truncate">
              {photo.caption}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SetPrimaryButton
            photoId={photo.id}
            farmId={farmId}
            isPrimary={photo.isPrimary}
          />
          {canDelete && (
            <PhotoDeleteButton
              photoId={photo.id}
              farmId={farmId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────

export function AnimalTimeline({ photos, context: _context, animalTag, farmId, canDelete }: AnimalTimelineProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  if (photos.length === 0) return <EmptyTimeline />

  // Ordena: mais recente primeiro
  const sorted: TimelinePhoto[] = [...photos].sort((a, b) => +b.takenAt - +a.takenAt)

  // Foto principal em destaque; se não houver, usa a primeira (mais recente)
  const primaryIdx = sorted.findIndex(p => p.isPrimary)
  const heroIdx    = primaryIdx >= 0 ? primaryIdx : 0
  const hero       = sorted[heroIdx]!
  const rest       = sorted.filter((_, i) => i !== heroIdx)

  const lightboxPhotos: LightboxPhoto[] = sorted.map((p) => ({
    id:        p.id,
    url:       p.url,
    caption:   p.caption,
    takenAt:   p.takenAt,
    isPrimary: p.isPrimary,
    farmId,
  }))

  // Índice no array sorted — necessário para abrir o lightbox na foto certa
  function sortedIndex(photo: TimelinePhoto) {
    return sorted.findIndex(p => p.id === photo.id)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Contador */}
        <p className="text-xs text-muted-foreground">
          {sorted.length} {sorted.length === 1 ? 'foto' : 'fotos'} de{' '}
          <span className="font-mono font-medium">{animalTag}</span>
        </p>

        {sorted.length === 1 ? (
          /* Foto única: destaque full-width */
          <PhotoCard
            photo={hero}
            index={heroIdx}
            farmId={farmId}
            canDelete={canDelete}
            onOpen={() => setLightboxIndex(heroIdx)}
          />
        ) : (
          /* 2+ fotos: grid 2 colunas em todas as telas */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sorted.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={sortedIndex(photo)}
                farmId={farmId}
                canDelete={canDelete}
                onOpen={() => setLightboxIndex(sortedIndex(photo))}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
