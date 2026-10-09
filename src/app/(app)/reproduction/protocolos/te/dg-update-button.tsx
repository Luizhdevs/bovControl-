'use client'

import { useTransition, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Ban } from 'lucide-react'
import { updateDGResult, discontinueAnimal } from '@/modules/reproduction/te-actions'
import type { DGStage } from '@/modules/reproduction/te-actions'
import type { TECurrentStage } from '@/modules/reproduction/te-queries'

// ─── Badge de status (somente leitura) ─────────────────────

export function StatusBadge({ stage }: { stage: TECurrentStage }) {
  if (stage === 'DISCONTINUED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-500 font-medium">
        Descontinuada
      </span>
    )
  }
  if (stage === 'PRENHA') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
        Prenha ✓
      </span>
    )
  }
  if (stage === 'WAITING_P60') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium">
        DG P30 ✓
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
  currentDGStage:  TECurrentStage
}

export function DGUpdateButton({ participationId, currentDGStage }: DGButtonProps) {
  const [mode, setMode]             = useState<'idle' | 'dg' | 'discontinue'>('idle')
  const [reason, setReason]         = useState('')
  const [pending, startTransition]  = useTransition()
  const [error, setError]           = useState<string | null>(null)

  // Só mostra ações para animais ainda aguardando DG
  const canAct = currentDGStage === 'WAITING_P30' || currentDGStage === 'WAITING_P60'
  const dgStage: DGStage = currentDGStage === 'WAITING_P60' ? 'DG_P60' : 'DG_P30'
  const dgLabel = currentDGStage === 'WAITING_P60' ? 'DG P60' : 'DG P30'

  if (!canAct) {
    return <StatusBadge stage={currentDGStage} />
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
      const result = await discontinueAnimal(participationId, reason.trim() || undefined)
      if (result.success) { setMode('idle'); setReason('') }
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
        {error && <p className="text-xs text-destructive text-right">{error}</p>}
      </div>
    )
  }

  if (mode === 'discontinue') {
    return (
      <div className="flex flex-col gap-1.5 items-end w-40">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
        />
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
            onClick={() => { setMode('idle'); setReason('') }}
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
          className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
            dgStage === 'DG_P60'
              ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25'
              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
          }`}
        >
          {dgLabel}
        </button>
        <button
          onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo"
        >
          <Ban className="size-3" />
        </button>
      </div>
    </div>
  )
}
