'use client'

import { useTransition }          from 'react'
import Link                       from 'next/link'
import { useToast }               from '@/hooks/use-toast'
import { Wheat, Pencil, Power }   from 'lucide-react'
import { formatCurrency }         from '@/lib/utils'
import { getProteinLabel }        from '../constants'
import { toggleFeedTypeActive }   from '../actions'
import type { FeedTypeItem }      from '../types'

interface FeedTypeCardProps {
  feedType:  FeedTypeItem
  farmId:    string
  canEdit:   boolean
}

export function FeedTypeCard({ feedType, farmId, canEdit }: FeedTypeCardProps) {
  const [pending, start] = useTransition()
  const { toast }        = useToast()
  const proteinTier = getProteinLabel(feedType.proteinPercent)

  async function handleToggle() {
    start(async () => {
      const result = await toggleFeedTypeActive(feedType.id, farmId)
      if (!result.success) toast({ title: result.error, variant: 'destructive' })
      else toast({ title: result.data.active ? 'Ração ativada' : 'Ração desativada' })
    })
  }

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 transition-opacity ${feedType.active ? 'border-border' : 'border-border/50 opacity-60'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${feedType.active ? 'bg-amber-500/10' : 'bg-muted'}`}>
            <Wheat className={`size-4 ${feedType.active ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{feedType.name}</p>
            {feedType.brand && (
              <p className="text-xs text-muted-foreground truncate">{feedType.brand}</p>
            )}
          </div>
        </div>
        {!feedType.active && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            Inativo
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Peso/saco</p>
          <p className="text-sm font-bold tabular-nums">{feedType.weightPerBagKg}kg</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Preço/saco</p>
          <p className="text-sm font-bold tabular-nums">{formatCurrency(feedType.pricePerBag)}</p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[10px] text-muted-foreground">Kg custo</p>
          <p className="text-sm font-bold tabular-nums">
            {formatCurrency(feedType.pricePerBag / feedType.weightPerBagKg)}/kg
          </p>
        </div>
      </div>

      {/* Proteína */}
      {proteinTier && feedType.proteinPercent != null && (
        <span className={`inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full ${proteinTier.color}`}>
          Proteína {feedType.proteinPercent}% · {proteinTier.label}
        </span>
      )}

      {/* Ações */}
      {canEdit && (
        <div className="flex items-center gap-3 pt-1">
          <Link
            href={`/feed-types/${feedType.id}/edit`}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="size-3" />
            Editar
          </Link>
          <button
            onClick={handleToggle}
            disabled={pending}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Power className="size-3" />
            {feedType.active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      )}
    </div>
  )
}
