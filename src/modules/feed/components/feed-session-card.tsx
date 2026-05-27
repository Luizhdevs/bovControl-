'use client'

import { useTransition }       from 'react'
import { useToast }            from '@/hooks/use-toast'
import { Wheat, Trash2 }       from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ConfirmDialog }        from '@/components/shared/confirm-dialog'
import { deleteFeedSession }    from '../actions'
import type { FeedSessionItem } from '../types'

interface FeedSessionCardProps {
  session:   FeedSessionItem
  farmId:    string
  canDelete: boolean
}

export function FeedSessionCard({ session, farmId, canDelete }: FeedSessionCardProps) {
  const [pending, start] = useTransition()
  const { toast }        = useToast()

  async function handleDelete() {
    start(async () => {
      const result = await deleteFeedSession(session.id, farmId)
      if (!result.success) toast({ title: result.error, variant: 'destructive' })
      else toast({ title: 'Sessão excluída' })
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Wheat className="size-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{session.lot.name}</p>
            <p className="text-xs text-muted-foreground">{formatDate(session.date)}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">{session.totalWeightKg.toFixed(0)} kg</p>
          <p className="text-xs text-muted-foreground tabular-nums">{formatCurrency(session.totalCost)}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Animais</p>
          <p className="text-sm font-bold tabular-nums">{session.animalCount}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Kg/animal</p>
          <p className="text-sm font-bold tabular-nums">{session.averageKgPerAnimal.toFixed(2)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Custo/animal</p>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(session.averageCostPerAnimal)}</p>
        </div>
      </div>

      {/* Ração + notas */}
      <p className="text-xs text-muted-foreground">
        {session.feedType.name}
        {session.feedType.brand ? ` (${session.feedType.brand})` : ''}
        {' · '}{session.bagCount} {session.bagCount === 1 ? 'saco' : 'sacos'}
      </p>
      {session.notes && (
        <p className="text-xs text-muted-foreground italic">"{session.notes}"</p>
      )}

      {/* Delete */}
      {canDelete && (
        <ConfirmDialog
          title="Excluir registro de alimentação?"
          description="Os acumuladores de consumo dos animais serão revertidos."
          variant="destructive"
          onConfirm={handleDelete}
        >
          <button
            disabled={pending}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3" />
            Excluir
          </button>
        </ConfirmDialog>
      )}
    </div>
  )
}
