'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal }                from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn }                          from '@/lib/utils'
import { formatDate }                  from '@/lib/utils'

export type LightboxPhoto = {
  id:      string
  url:     string
  caption: string | null
  takenAt: Date
}

interface PhotoLightboxProps {
  photos:       LightboxPhoto[]
  initialIndex: number
  onClose:      () => void
}

export function PhotoLightbox({ photos, initialIndex, onClose }: PhotoLightboxProps) {
  const [index,   setIndex]   = useState(initialIndex)
  const [visible, setVisible] = useState(false)
  const touchStartX           = useRef<number | null>(null)

  const photo    = photos[index]!
  const hasMany  = photos.length > 1

  // Entrada suave
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Bloqueia scroll do body
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')      handleClose()
      if (e.key === 'ArrowLeft')   go(-1)
      if (e.key === 'ArrowRight')  go(+1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function go(dir: 1 | -1) {
    setIndex(i => (i + dir + photos.length) % photos.length)
  }

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 180)
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]!.clientX
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0]!.clientX - touchStartX.current
    if (Math.abs(delta) > 45) go(delta < 0 ? 1 : -1)
    touchStartX.current = null
  }

  const content = (
    <div
      role="dialog"
      aria-modal
      className={cn(
        'fixed inset-0 z-[100] flex items-center justify-center transition-[background-color] duration-200',
        visible ? 'bg-black/92' : 'bg-black/0',
      )}
      onClick={handleClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Botão fechar */}
      <button
        onClick={(e) => { e.stopPropagation(); handleClose() }}
        aria-label="Fechar"
        className="absolute top-4 right-4 z-10 size-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors"
      >
        <X className="size-5" />
      </button>

      {/* Prev */}
      {hasMany && (
        <button
          onClick={(e) => { e.stopPropagation(); go(-1) }}
          aria-label="Foto anterior"
          className="absolute left-3 sm:left-6 z-10 size-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}

      {/* Imagem */}
      <div
        className={cn(
          'relative flex items-center justify-center transition-[opacity,transform] duration-200',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.caption ?? `Foto de ${formatDate(photo.takenAt)}`}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl"
          draggable={false}
        />
      </div>

      {/* Next */}
      {hasMany && (
        <button
          onClick={(e) => { e.stopPropagation(); go(+1) }}
          aria-label="Próxima foto"
          className="absolute right-3 sm:right-6 z-10 size-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 active:bg-white/30 transition-colors"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      {/* Info + contador — parte de baixo */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-8 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
        <div className="flex items-end justify-between">
          <div>
            {photo.caption && (
              <p className="text-white text-sm italic mb-0.5">"{photo.caption}"</p>
            )}
            <p className="text-white/60 text-xs">{formatDate(photo.takenAt)}</p>
          </div>
          {hasMany && (
            <span className="text-white/50 text-xs tabular-nums">{index + 1} / {photos.length}</span>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
