'use client'

import { useState }      from 'react'
import Image             from 'next/image'
import { PhotoLightbox, type LightboxPhoto } from './photo-lightbox'

interface HeroPhotoButtonProps {
  photos:  LightboxPhoto[]
  primary: LightboxPhoto
  sizes:   string
}

export function HeroPhotoButton({ photos, primary, sizes }: HeroPhotoButtonProps) {
  const [open, setOpen] = useState(false)

  const initialIndex = photos.findIndex(p => p.id === primary.id)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none"
        aria-label="Ampliar foto"
      >
        <Image
          src={primary.url}
          alt={primary.caption ?? 'Foto do animal'}
          fill
          sizes={sizes}
          className="object-cover object-center"
          priority
        />
      </button>

      {open && (
        <PhotoLightbox
          photos={photos}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
