'use client'

import { useTransition, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Ban, Syringe } from 'lucide-react'
import {
  recordIATFD8,
  recordIATFIA,
  updateIATFDGResult,
  discontinueIATFAnimal,
  recordIATFAbortion,
} from '@/modules/reproduction/iatf-actions'
import type { IATFCurrentStage } from '@/modules/reproduction/iatf-queries'

// ─── Badge de status (somente leitura) ─────────────────────

export function IATFStatusBadge({ stage }: { stage: IATFCurrentStage }) {
  const configs: Record<IATFCurrentStage, { label: string; cls: string }> = {
    PENDING_D8:  { label: 'Aguardando D8',      cls: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
    PENDING_IA:  { label: 'D8 ✓ — Aguarda IA',  cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    WAITING_DG:  { label: 'Aguardando DG',       cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
    PRENHA:      { label: 'Prenha ✓',            cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
    VAZIA:       { label: 'Vazia',               cls: 'bg-red-500/15 text-red-500' },
    ABORTED:     { label: 'Aborto',              cls: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
    DISCONTINUED:{ label: 'Descontinuada',       cls: 'bg-zinc-500/15 text-zinc-500' },
  }
  const { label, cls } = configs[stage]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ─── Botões de ação inline ─────────────────────────────────

type ActionMode =
  | 'idle'
  | 'd8_confirm'
  | 'ia_confirm'
  | 'dg'
  | 'discontinue'
  | 'abort_confirm'

interface Props {
  participationId: string
  currentStage:    IATFCurrentStage
}

export function IATFStepButton({ participationId, currentStage }: Props) {
  const [mode, setMode]            = useState<ActionMode>('idle')
  const [reason, setReason]        = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)

  const terminalStages: IATFCurrentStage[] = ['VAZIA', 'ABORTED', 'DISCONTINUED']
  if (terminalStages.includes(currentStage)) {
    return <IATFStatusBadge stage={currentStage} />
  }

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const r = await fn()
      if (r.success) { setMode('idle'); setReason('') }
      else           { setError(r.error ?? 'Erro') }
    })
  }

  // ── PRENHA: apenas aborto disponível ──────────────────────
  if (currentStage === 'PRENHA') {
    if (mode === 'abort_confirm') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5 text-right">Confirmar aborto?</div>
          <div className="flex gap-1.5">
            <button
              disabled={pending}
              onClick={() => run(() => recordIATFAbortion(participationId, reason.trim() || undefined))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
              Confirmar
            </button>
            <button disabled={pending} onClick={() => { setMode('idle'); setReason('') }}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }
    return (
      <div className="flex gap-1.5 items-center">
        <IATFStatusBadge stage="PRENHA" />
        <button
          onClick={() => setMode('abort_confirm')}
          className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20 transition-colors"
          title="Registrar aborto"
        >
          Aborto
        </button>
      </div>
    )
  }

  // ── D8: hormônios de cio ────────────────────────────────
  if (currentStage === 'PENDING_D8') {
    if (mode === 'd8_confirm') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5 text-right">Confirmar D8 — hormônios?</div>
          <div className="flex gap-1.5">
            <button
              disabled={pending}
              onClick={() => run(() => recordIATFD8(participationId))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Sim
            </button>
            <button disabled={pending} onClick={() => setMode('idle')}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode('d8_confirm')}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25 transition-colors font-medium"
        >
          <Syringe className="size-3" />
          D8 — Hormônios ✓
        </button>
        <button onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo">
          <Ban className="size-3" />
        </button>
      </div>
    )
  }

  // ── IA: D10 ─────────────────────────────────────────────
  if (currentStage === 'PENDING_IA') {
    if (mode === 'ia_confirm') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5 text-right">Confirmar IA realizada?</div>
          <div className="flex gap-1.5">
            <button
              disabled={pending}
              onClick={() => run(() => recordIATFIA(participationId))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Sim
            </button>
            <button disabled={pending} onClick={() => setMode('idle')}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => setMode('ia_confirm')}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 transition-colors font-medium"
        >
          <Syringe className="size-3" />
          IA ✓
        </button>
        <button onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo">
          <Ban className="size-3" />
        </button>
      </div>
    )
  }

  // ── DG ───────────────────────────────────────────────────
  if (currentStage === 'WAITING_DG') {
    if (mode === 'dg') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5">Resultado DG:</div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button disabled={pending}
              onClick={() => run(() => updateIATFDGResult(participationId, 'CONFIRMED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Prenha
            </button>
            <button disabled={pending}
              onClick={() => run(() => updateIATFDGResult(participationId, 'FAILED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
              Vazia
            </button>
            <button disabled={pending} onClick={() => setMode('idle')}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
          </div>
          {error && <p className="text-xs text-destructive text-right">{error}</p>}
        </div>
      )
    }
    return (
      <div className="flex gap-1.5">
        <button onClick={() => setMode('dg')}
          className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 font-medium transition-colors">
          DG →
        </button>
        <button onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo">
          <Ban className="size-3" />
        </button>
      </div>
    )
  }

  // ── Descontinuar ─────────────────────────────────────────
  if (mode === 'discontinue') {
    return (
      <div className="flex flex-col gap-1.5 items-end w-40">
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary" />
        <div className="flex gap-1.5">
          <button disabled={pending}
            onClick={() => run(() => discontinueIATFAnimal(participationId, reason.trim() || undefined))}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-zinc-600 text-white hover:bg-zinc-700 disabled:opacity-60 transition-colors">
            {pending ? <Loader2 className="size-3 animate-spin" /> : <Ban className="size-3" />}
            Confirmar
          </button>
          <button disabled={pending} onClick={() => { setMode('idle'); setReason('') }}
            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return <IATFStatusBadge stage={currentStage} />
}
