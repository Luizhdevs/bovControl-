'use client'

import { useState, useTransition } from 'react'
import { useRouter }  from 'next/navigation'
import { useToast }   from '@/hooks/use-toast'
import { Button }     from '@/components/ui/button'
import {
  CheckCircle2, AlertTriangle, Loader2, ChevronRight,
} from 'lucide-react'
import { confirmVeterinaryImport } from '../actions'
import type { VeterinaryImportPreview } from '../types'

interface Props {
  reportId:         string
  linkedCount:      number
  isAlreadyImported?: boolean
  preview:          VeterinaryImportPreview
}

export function ConfirmImportButton({
  reportId,
  linkedCount,
  isAlreadyImported,
  preview,
}: Props) {
  const router                       = useRouter()
  const { toast }                    = useToast()
  const [step, setStep]              = useState<'idle' | 'confirm'>('idle')
  const [isPending, startTransition] = useTransition()

  if (isAlreadyImported) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
        <CheckCircle2 className="size-4" />
        Importação confirmada
      </div>
    )
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmVeterinaryImport(reportId)

      if (!result.success) {
        toast({
          title:       'Erro ao confirmar',
          description: result.error,
          variant:     'destructive',
        })
        setStep('idle')
        return
      }

      const { animalsUpdated, reproductionsCreated, healthEventsCreated, alertsCreated } = result.data

      toast({
        title:       'Importação confirmada!',
        description: `${animalsUpdated} animais · ${reproductionsCreated} reproduções · ${healthEventsCreated} eventos · ${alertsCreated} alertas`,
      })

      router.push('/veterinary/import')
    })
  }

  // ── Passo 1: botão inicial ────────────────────────────
  if (step === 'idle') {
    return (
      <Button
        onClick={() => setStep('confirm')}
        disabled={linkedCount === 0}
        className="gap-2"
      >
        <ChevronRight className="size-4" />
        Confirmar importação
        {linkedCount > 0 && (
          <span className="text-xs opacity-75">
            ({linkedCount} animal{linkedCount !== 1 ? 'is' : ''})
          </span>
        )}
      </Button>
    )
  }

  // ── Passo 2: dialog de confirmação com resumo ─────────
  return (
    <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-4 space-y-4">
      {/* Aviso */}
      <div className="flex gap-2.5 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Confirmar esta ação?</p>
          <p className="text-xs leading-relaxed">
            Esta ação irá <strong>atualizar dados dos animais</strong>, criar eventos reprodutivos,
            eventos sanitários e alertas. Ela <strong>não deve ser executada</strong> antes da revisão
            completa dos vínculos e não pode ser desfeita facilmente.
          </p>
        </div>
      </div>

      {/* Resumo do que será feito */}
      <div className="rounded-md bg-background border border-border p-3 space-y-1">
        <p className="text-xs font-semibold text-foreground mb-1.5">O que será aplicado:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>
            <span className="text-foreground font-medium">{preview.animalsToUpdate}</span>
            {' '}animal{preview.animalsToUpdate !== 1 ? 'is' : ''} terão campos atualizados
          </li>
          <li>
            <span className="text-foreground font-medium">{preview.reproductionsToCreate}</span>
            {' '}evento{preview.reproductionsToCreate !== 1 ? 's' : ''} reprodutivo{preview.reproductionsToCreate !== 1 ? 's' : ''} serão criados
          </li>
          <li>
            <span className="text-foreground font-medium">{preview.healthEventsToCreate}</span>
            {' '}evento{preview.healthEventsToCreate !== 1 ? 's' : ''} de saúde serão criados
          </li>
          <li>
            <span className="text-foreground font-medium">{preview.alertsToCreate}</span>
            {' '}alerta{preview.alertsToCreate !== 1 ? 's' : ''} serão gerados
          </li>
          {preview.unmatchedCount > 0 && (
            <li className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">{preview.unmatchedCount}</span>
              {' '}linha{preview.unmatchedCount !== 1 ? 's' : ''} sem vínculo serão ignoradas para atualização
            </li>
          )}
          {preview.skippedSnapshots > 0 && (
            <li className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">{preview.skippedSnapshots}</span>
              {' '}snapshot{preview.skippedSnapshots !== 1 ? 's' : ''} serão pulados (animal não encontrado)
            </li>
          )}
        </ul>

        {preview.warnings.length > 0 && (
          <div className="mt-2 pt-2 border-t border-border space-y-0.5">
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              {preview.warnings.length} aviso{preview.warnings.length !== 1 ? 's' : ''}:
            </p>
            {preview.warnings.slice(0, 3).map((w, i) => (
              <p key={i} className="text-[10px] text-muted-foreground truncate">{w}</p>
            ))}
            {preview.warnings.length > 3 && (
              <p className="text-[10px] text-muted-foreground">
                +{preview.warnings.length - 3} mais
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          onClick={handleConfirm}
          disabled={isPending}
          size="sm"
          className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Confirmando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" />
              Confirmar e aplicar
            </>
          )}
        </Button>
        <Button
          onClick={() => setStep('idle')}
          disabled={isPending}
          variant="outline"
          size="sm"
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
