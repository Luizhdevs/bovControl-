'use client'

import { useState, useTransition } from 'react'
import { useRouter }  from 'next/navigation'
import { useToast }   from '@/hooks/use-toast'
import { Button }     from '@/components/ui/button'
import {
  PlusCircle, AlertTriangle, Loader2, ChevronRight, Tag,
} from 'lucide-react'
import { createAnimalsFromUnmatchedVeterinarySnapshots } from '../actions'
import type { CreateAnimalsFromSnapshotsPreview } from '../types'

interface Props {
  reportId:      string
  unmatchedCount: number
  preview:       CreateAnimalsFromSnapshotsPreview
}

export function CreateAnimalsButton({ reportId, unmatchedCount, preview }: Props) {
  const router                       = useRouter()
  const { toast }                    = useToast()
  const [step, setStep]              = useState<'idle' | 'confirm'>('idle')
  const [isPending, startTransition] = useTransition()

  if (unmatchedCount === 0) return null

  function handleCreate() {
    startTransition(async () => {
      const result = await createAnimalsFromUnmatchedVeterinarySnapshots(reportId)

      if (!result.success) {
        toast({
          title:       'Erro ao criar animais',
          description: result.error,
          variant:     'destructive',
        })
        setStep('idle')
        return
      }

      const { created, linked, conflicts } = result.data

      toast({
        title: `${created} animal${created !== 1 ? 'is' : ''} criado${created !== 1 ? 's' : ''}`,
        description: [
          `${linked} snapshot${linked !== 1 ? 's' : ''} vinculado${linked !== 1 ? 's' : ''}`,
          conflicts > 0 ? `${conflicts} conflito${conflicts !== 1 ? 's' : ''} ignorado${conflicts !== 1 ? 's' : ''}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      })

      router.refresh()
    })
  }

  // ── Passo 1: botão inicial ────────────────────────────
  if (step === 'idle') {
    return (
      <Button
        onClick={() => setStep('confirm')}
        variant="outline"
        className="gap-2 border-blue-500/40 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
      >
        <PlusCircle className="size-4" />
        Criar animais com ID do BovControl
        <span className="text-xs opacity-75">
          ({preview.createCount} para criar)
        </span>
      </Button>
    )
  }

  // ── Passo 2: confirmação com preview ──────────────────
  return (
    <div className="rounded-lg border border-blue-500/40 bg-blue-500/5 p-4 space-y-4">
      {/* Aviso */}
      <div className="flex gap-2.5 text-sm text-blue-700 dark:text-blue-400">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold">Criar animais no BovControl?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Os animais serão cadastrados com tag e ID gerados automaticamente pelo BovControl.
            O código do veterinário será salvo apenas como código externo (não vira brinco principal).
            Esta operação pode ser revertida manualmente excluindo os animais.
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="rounded-md bg-background border border-border p-3 space-y-1">
        <p className="text-xs font-semibold text-foreground mb-1.5">O que será feito:</p>
        <ul className="text-xs text-muted-foreground space-y-0.5">
          <li>
            <span className="text-foreground font-medium">{preview.createCount}</span>
            {' '}animal{preview.createCount !== 1 ? 'is' : ''} serão criados com tag BOV-XXXX
          </li>
          <li>
            <span className="text-foreground font-medium">{preview.snapshotsToLink}</span>
            {' '}snapshot{preview.snapshotsToLink !== 1 ? 's' : ''} serão vinculados automaticamente
          </li>
          {preview.conflictCount > 0 && (
            <li className="text-amber-600 dark:text-amber-400">
              <span className="font-medium">{preview.conflictCount}</span>
              {' '}conflito{preview.conflictCount !== 1 ? 's' : ''} serão ignorados (animal já existe)
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
              <p className="text-[10px] text-muted-foreground">+{preview.warnings.length - 3} mais</p>
            )}
          </div>
        )}
      </div>

      {/* Tabela de preview (primeiros 8) */}
      {preview.animalsToCreate.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Tag (BOV)</th>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Cód. Vet</th>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Categoria</th>
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Grupos</th>
              </tr>
            </thead>
            <tbody>
              {preview.animalsToCreate.slice(0, 8).map((a) => (
                <tr key={a.key} className="border-t border-border/50">
                  <td className="px-2 py-1 text-muted-foreground italic">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" />
                      automático
                    </span>
                  </td>
                  <td className="px-2 py-1 font-mono text-foreground">{a.externalCode ?? '—'}</td>
                  <td className="px-2 py-1 text-foreground">{a.animalName ?? '—'}</td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {a.category === 'HEIFER' ? 'Novilha' : 'Vaca'}
                  </td>
                  <td className="px-2 py-1 text-muted-foreground">
                    {a.groups.join(', ').slice(0, 40) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.animalsToCreate.length > 8 && (
            <p className="text-[10px] text-muted-foreground px-2 py-1 bg-muted/30 border-t border-border">
              +{preview.animalsToCreate.length - 8} mais
            </p>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-2">
        <Button
          onClick={handleCreate}
          disabled={isPending}
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Criando animais...
            </>
          ) : (
            <>
              <PlusCircle className="size-4" />
              Criar {preview.createCount} animal{preview.createCount !== 1 ? 'is' : ''}
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
