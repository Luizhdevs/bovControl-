'use client'

import { useTransition, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { updateDGResult } from '@/modules/reproduction/te-actions'
import type { DGStage } from '@/modules/reproduction/te-actions'

interface Props {
  reproductionId: string
  animalTag:      string
  dgStage:        DGStage
  currentStatus:  'PENDING' | 'CONFIRMED' | 'FAILED'
}

export function DGUpdateButton({ reproductionId, dgStage, currentStatus }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)

  if (currentStatus === 'CONFIRMED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
        Prenha
      </span>
    )
  }

  if (currentStatus === 'FAILED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-medium">
        Vazia
      </span>
    )
  }

  function handleUpdate(newStatus: 'CONFIRMED' | 'FAILED') {
    setError(null)
    startTransition(async () => {
      const result = await updateDGResult(reproductionId, dgStage, newStatus)
      if (result.success) {
        setExpanded(false)
      } else {
        setError(result.error ?? 'Erro')
      }
    })
  }

  if (expanded) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1.5">
          <button
            disabled={pending}
            onClick={() => handleUpdate('CONFIRMED')}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
            Prenha
          </button>
          <button
            disabled={pending}
            onClick={() => handleUpdate('FAILED')}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
            Vazia
          </button>
          <button
            disabled={pending}
            onClick={() => setExpanded(false)}
            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            ✕
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/25 transition-colors"
    >
      Aguardando
    </button>
  )
}
