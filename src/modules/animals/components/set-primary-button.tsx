'use client'

import { useTransition } from 'react'
import { useToast }      from '@/hooks/use-toast'
import { Star }          from 'lucide-react'
import { setPhotoAsPrimary } from '../actions'
import { cn } from '@/lib/utils'

interface SetPrimaryButtonProps {
  photoId:   string
  farmId:    string
  isPrimary: boolean
}

export function SetPrimaryButton({ photoId, farmId, isPrimary }: SetPrimaryButtonProps) {
  const [isPending, start] = useTransition()
  const { toast }          = useToast()

  if (isPrimary) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500">
        <Star className="size-3 fill-amber-500" />
        Principal
      </span>
    )
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    start(async () => {
      const result = await setPhotoAsPrimary(photoId, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Foto definida como principal!' })
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      aria-label="Definir como foto principal"
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium transition-colors',
        'text-muted-foreground/50 hover:text-amber-500 disabled:opacity-40',
      )}
    >
      <Star className="size-3" />
      {isPending ? 'Salvando…' : 'Definir como principal'}
    </button>
  )
}
