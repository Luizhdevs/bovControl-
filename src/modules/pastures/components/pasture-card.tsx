'use client'

import { useTransition } from 'react'
import { useToast }      from '@/hooks/use-toast'
import { deactivatePasture, reactivatePasture } from '../actions'
import Link   from 'next/link'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  Pencil,
  PowerOff,
  Power,
  Loader2,
  Layers2,
  PawPrint,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PastureListItem } from '../types'

// ─── Componente ────────────────────────────────────────────

interface PastureCardProps {
  pasture:   PastureListItem
  farmId:    string
  canManage: boolean   // MANAGER+ role
}

export function PastureCard({ pasture, farmId, canManage }: PastureCardProps) {
  const { toast }               = useToast()
  const [isPending, startTransition] = useTransition()

  const occupancyPct = pasture.maxCapacity && pasture.maxCapacity > 0
    ? Math.min(100, Math.round((pasture.animalCount / pasture.maxCapacity) * 100))
    : null

  function handleToggle() {
    startTransition(async () => {
      const result = pasture.isActive
        ? await deactivatePasture(pasture.id, farmId)
        : await reactivatePasture(pasture.id, farmId)

      if (result.success) {
        toast({ title: pasture.isActive ? 'Pasto desativado' : 'Pasto reativado' })
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-3 transition-opacity',
      !pasture.isActive && 'opacity-60',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{pasture.name}</p>
            {pasture.grassType && (
              <p className="text-xs text-muted-foreground">{pasture.grassType}</p>
            )}
          </div>
        </div>
        {!pasture.isActive && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded shrink-0">
            Inativo
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {pasture.areaHectares && (
          <span>{pasture.areaHectares} ha</span>
        )}
        <span className="flex items-center gap-1">
          <Layers2 className="size-3" />
          {pasture._count.lots} {pasture._count.lots === 1 ? 'lote' : 'lotes'}
        </span>
        <span className="flex items-center gap-1">
          <PawPrint className="size-3" />
          {pasture.animalCount} animais
        </span>
      </div>

      {/* Barra de ocupação */}
      {pasture.maxCapacity && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ocupação</span>
            <span>{pasture.animalCount}/{pasture.maxCapacity}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                (occupancyPct ?? 0) >= 90 ? 'bg-red-500' :
                (occupancyPct ?? 0) >= 70 ? 'bg-amber-500' : 'bg-green-500',
              )}
              style={{ width: `${occupancyPct ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {canManage && (
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
            <Link href={`/pastures/${pasture.id}/edit`}>
              <Pencil className="size-3 mr-1" />
              Editar
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            title={pasture.isActive ? 'Desativar pasto' : 'Reativar pasto'}
            disabled={isPending}
            onClick={handleToggle}
          >
            {isPending
              ? <Loader2 className="size-3 animate-spin" />
              : pasture.isActive
              ? <PowerOff className="size-3" />
              : <Power className="size-3 text-green-500" />}
          </Button>
        </div>
      )}
    </div>
  )
}
