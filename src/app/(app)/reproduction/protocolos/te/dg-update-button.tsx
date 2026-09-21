'use client'

import { useTransition, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Ban } from 'lucide-react'
import { updateDGResult, discontinueAnimal } from '@/modules/reproduction/te-actions'
import type { DGStage } from '@/modules/reproduction/te-actions'

// ─── Badge de status (somente leitura) ─────────────────────

export function StatusBadge({
  participationStatus,
  dgStatus,
}: {
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
  dgStatus: 'PENDING' | 'CONFIRMED' | 'FAILED' | null
}) {
  if (participationStatus === 'DISCONTINUED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-500 font-medium">
        Descontinuada
      </span>
    )
  }
  if (participationStatus === 'COMPLETED' || dgStatus === 'CONFIRMED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
        Prenha ✓
      </span>
    )
  }
  if (dgStatus === 'FAILED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-medium">
        Vazia
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
      Aguardando
    </span>
  )
}

// ─── Botões de ação inline ─────────────────────────────────

interface DGButtonProps {
  participationId: string
  dgStage:         DGStage
  participationStatus: 'ACTIVE' | 'DISCONTINUED' | 'COMPLETED'
  dgStatus:        'PENDING' | 'CONFIRMED' | 'FAILED' | null
}

export function DGUpdateButton({
  participationId,
  dgStage,
  participationStatus,
  dgStatus,
}: DGButtonProps) {
  const [mode, setMode]            = useState<'idle' | 'dg' | 'discontinue'>('idle')
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)

  // Só mostra ações se participação ainda ACTIVE e DG ainda PENDING
  const canAct = participationStatus === 'ACTIVE' && (dgStatus === 'PENDING' || dgStatus === null)

  if (!canAct) {
    return (
      <StatusBadge
        participationStatus={participationStatus}
        dgStatus={dgStatus}
      />
    )
  }

  function handleDG(newStatus: 'CONFIRMED' | 'FAILED') {
    setError(null)
    startTransition(async () => {
      const result = await updateDGResult(participationId, dgStage, newStatus)
      if (result.success) { setMode('idle') }
      else { setError(result.error ?? 'Erro') }
    })
  }

  function handleDiscontinue() {
    setError(null)
    startTransition(async () => {
      const result = await discontinueAnimal(participationId)
      if (result.success) { setMode('idle') }
      else { setError(result.error ?? 'Erro') }
    })
  }

  if (mode === 'dg') {
    return (
      <div className="flex flex-col gap-1 items-end">
        <div className="flex gap-1.5 flex-wrap justify-end">
          <button
            disabled={pending}
            onClick={() => handleDG('CONFIRMED')}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
            Prenha
          </button>
          <button
            disabled={pending}
            onClick={() => handleDG('FAILED')}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
            Vazia
          </button>
          <button
            disabled={pending}
            onClick={() => setMode('idle')}
            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            ✕
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  if (mode === 'discontinue') {
    return (
      <div className="flex flex-col gap-1 items-end">
        <div className="flex gap-1.5">
          <button
            disabled={pending}
            onClick={handleDiscontinue}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-zinc-600 text-white hover:bg-zinc-700 disabled:opacity-60 transition-colors"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Ban className="size-3" />}
            Confirmar
          </button>
          <button
            disabled={pending}
            onClick={() => setMode('idle')}
            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            ✕
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  // idle
  return (
    <div className="flex flex-col gap-1 items-end">
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode('dg')}
          className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/25 transition-colors"
        >
          DG
        </button>
        <button
          onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Descontinuar do protocolo"
        >
          <Ban className="size-3" />
        </button>
      </div>
    </div>
  )
}
