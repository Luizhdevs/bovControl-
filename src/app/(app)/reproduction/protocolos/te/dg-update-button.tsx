'use client'

import { useTransition, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Ban, Syringe, FlaskConical } from 'lucide-react'
import {
  recordWithdrawal,
  recordTEResponse,
  updateDGResult,
  discontinueAnimal,
  recordTEAbortion,
} from '@/modules/reproduction/te-actions'
import type { TECurrentStage } from '@/modules/reproduction/te-queries'

// ─── Badge de status (somente leitura) ─────────────────────

export function StatusBadge({ stage, sexagemResult }: { stage: TECurrentStage; sexagemResult?: string | null }) {
  if (stage === 'DISCONTINUED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-500 font-medium">
        Descontinuada
      </span>
    )
  }
  if (stage === 'ABORTED') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-medium">
        Aborto
      </span>
    )
  }
  if (stage === 'PRENHA') {
    const label =
      sexagemResult === 'FEMALE' ? 'Prenha ♀ Bezerra' :
      sexagemResult === 'MALE'   ? 'Prenha ♂ Bezerro' :
                                   'Prenha ✓'
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
        {label}
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
  if (stage === 'WAITING_P30') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
        Aguardando DG
      </span>
    )
  }
  if (stage === 'TE_NO_RESPONSE') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-medium">
        Sem resposta
      </span>
    )
  }
  if (stage === 'PENDING_TE') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium">
        Aguardando TE
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-medium">
      Implante ativo
    </span>
  )
}

// ─── Botões de ação inline ─────────────────────────────────

type ActionMode =
  | 'idle'
  | 'withdrawal_confirm'
  | 'te_response'
  | 'keep_no_response'
  | 'dg_p30'
  | 'dg_p60'
  | 'discontinue'
  | 'abort_confirm'

interface DGButtonProps {
  participationId: string
  currentDGStage:  TECurrentStage
  sexagemResult?:  string | null
}

export function DGUpdateButton({ participationId, currentDGStage, sexagemResult }: DGButtonProps) {
  const [mode, setMode]            = useState<ActionMode>('idle')
  const [reason, setReason]        = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)

  const terminalStages: TECurrentStage[] = ['DISCONTINUED', 'ABORTED']
  if (terminalStages.includes(currentDGStage)) {
    return <StatusBadge stage={currentDGStage} sexagemResult={sexagemResult} />
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
  if (currentDGStage === 'PRENHA') {
    if (mode === 'abort_confirm') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5 text-right">Confirmar aborto?</div>
          <div className="flex gap-1.5">
            <button
              disabled={pending}
              onClick={() => run(() => recordTEAbortion(participationId, reason.trim() || undefined))}
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
        <StatusBadge stage="PRENHA" sexagemResult={sexagemResult} />
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

  // ── Dia 8: hormônios ───────────────────────────────────────
  if (currentDGStage === 'PENDING_WITHDRAWAL') {
    if (mode === 'withdrawal_confirm') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5 text-right">Confirmar aplicação?</div>
          <div className="flex gap-1.5">
            <button
              disabled={pending}
              onClick={() => run(() => recordWithdrawal(participationId))}
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
      <button
        onClick={() => setMode('withdrawal_confirm')}
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25 transition-colors font-medium"
      >
        <Syringe className="size-3" />
        Hormônios ✓
      </button>
    )
  }

  // ── TE: resposta ───────────────────────────────────────────
  if (currentDGStage === 'PENDING_TE') {
    if (mode === 'te_response') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5">Resultado TE:</div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button disabled={pending}
              onClick={() => run(() => recordTEResponse(participationId, 'RESPONDED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Respondeu
            </button>
            <button disabled={pending}
              onClick={() => run(() => recordTEResponse(participationId, 'NOT_RESPONDED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <XCircle className="size-3" />}
              Não respondeu
            </button>
            <button disabled={pending} onClick={() => setMode('idle')}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }
    return (
      <button onClick={() => setMode('te_response')}
        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 transition-colors font-medium">
        <FlaskConical className="size-3" />
        TE →
      </button>
    )
  }

  // ── Sem resposta: manter ou descontinuar ───────────────────
  if (currentDGStage === 'TE_NO_RESPONSE') {
    if (mode === 'keep_no_response') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5 text-right text-xs leading-tight max-w-36 text-right">
            Manter no protocolo para DG?
          </div>
          <div className="flex gap-1.5">
            <button disabled={pending}
              onClick={() => run(() => recordTEResponse(participationId, 'RESPONDED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Manter
            </button>
            <button disabled={pending} onClick={() => setMode('idle')}
              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">✕</button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )
    }
    if (mode === 'discontinue') {
      return (
        <div className="flex flex-col gap-1.5 items-end w-40">
          <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional)"
            className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary" />
          <div className="flex gap-1.5">
            <button disabled={pending}
              onClick={() => run(() => discontinueAnimal(participationId, reason.trim() || undefined))}
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
    return (
      <div className="flex gap-1.5">
        <button onClick={() => setMode('keep_no_response')}
          className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors font-medium">
          Manter
        </button>
        <button onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo">
          <Ban className="size-3" />
        </button>
      </div>
    )
  }

  // ── DG P30 ─────────────────────────────────────────────────
  if (currentDGStage === 'WAITING_P30') {
    if (mode === 'dg_p30') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5">DG P30:</div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button disabled={pending}
              onClick={() => run(() => updateDGResult(participationId, 'DG_P30', 'CONFIRMED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle2 className="size-3" />}
              Prenha
            </button>
            <button disabled={pending}
              onClick={() => run(() => updateDGResult(participationId, 'DG_P30', 'FAILED'))}
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
        <button onClick={() => setMode('dg_p30')}
          className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 font-medium transition-colors">
          DG P30
        </button>
        <button onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo">
          <Ban className="size-3" />
        </button>
      </div>
    )
  }

  // ── DG P60 / Sexagem ───────────────────────────────────────
  if (currentDGStage === 'WAITING_P60') {
    if (mode === 'dg_p60') {
      return (
        <div className="flex flex-col gap-1 items-end">
          <div className="text-xs text-muted-foreground mb-0.5">DG P60 / Sexagem:</div>
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button disabled={pending}
              onClick={() => run(() => updateDGResult(participationId, 'DG_P60', 'CONFIRMED', 'FEMALE'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : null}
              ♀ Bezerra
            </button>
            <button disabled={pending}
              onClick={() => run(() => updateDGResult(participationId, 'DG_P60', 'CONFIRMED', 'MALE'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : null}
              ♂ Bezerro
            </button>
            <button disabled={pending}
              onClick={() => run(() => updateDGResult(participationId, 'DG_P60', 'FAILED', 'ABSORBED'))}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-60 transition-colors">
              {pending ? <Loader2 className="size-3 animate-spin" /> : null}
              Absorvida
            </button>
            <button disabled={pending}
              onClick={() => run(() => updateDGResult(participationId, 'DG_P60', 'FAILED'))}
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
        <button onClick={() => setMode('dg_p60')}
          className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 hover:bg-violet-500/25 font-medium transition-colors">
          DG P60
        </button>
        <button onClick={() => setMode('discontinue')}
          className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20 transition-colors"
          title="Retirar do protocolo">
          <Ban className="size-3" />
        </button>
      </div>
    )
  }

  // Fallback: descontinuar
  if (mode === 'discontinue') {
    return (
      <div className="flex flex-col gap-1.5 items-end w-40">
        <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="w-full text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary" />
        <div className="flex gap-1.5">
          <button disabled={pending}
            onClick={() => run(() => discontinueAnimal(participationId, reason.trim() || undefined))}
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

  return <StatusBadge stage={currentDGStage} />
}
