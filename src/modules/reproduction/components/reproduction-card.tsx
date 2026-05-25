'use client'

import { useTransition } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  REPRODUCTION_TYPE_LABELS,
  REPRODUCTION_STATUS_LABELS,
} from '@/modules/shared/domain/animal-labels'
import { deleteReproduction } from '../actions'
import type { ReproductionWithAnimal } from '../types'

// ─── Config visual por tipo ────────────────────────────────

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  INSEMINATION:    { emoji: '💉', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  NATURAL_MATING:  { emoji: '🐂', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  PREGNANCY_CHECK: { emoji: '🔬', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
}

const STATUS_CONFIG: Record<string, { className: string }> = {
  PENDING:   { className: 'text-muted-foreground bg-muted border-border' },
  CONFIRMED: { className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  FAILED:    { className: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

// ─── Componente ────────────────────────────────────────────

interface ReproductionCardProps {
  record:      ReproductionWithAnimal
  farmId:      string
  showAnimal?: boolean
  canDelete?:  boolean
}

export function ReproductionCard({
  record,
  farmId,
  showAnimal = true,
  canDelete  = false,
}: ReproductionCardProps) {
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  const typeConfig   = TYPE_CONFIG[record.type]   ?? { emoji: '📋', color: 'text-muted-foreground bg-muted border-border' }
  const statusConfig = STATUS_CONFIG[record.status] ?? STATUS_CONFIG['PENDING']!

  function handleDelete() {
    if (!confirm('Excluir este registro reprodutivo?')) return
    startTransition(async () => {
      const result = await deleteReproduction(record.id, farmId)
      if (result.success) {
        toast({ title: 'Registro excluído' })
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <div className={cn('py-3 flex gap-3 items-start', isPending && 'opacity-50')}>
      {/* Ícone do tipo */}
      <div
        className={cn(
          'size-9 rounded-full flex items-center justify-center text-base shrink-0 border',
          typeConfig.color,
        )}
      >
        {typeConfig.emoji}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">
            {REPRODUCTION_TYPE_LABELS[record.type] ?? record.type}
          </span>
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
              statusConfig.className,
            )}
          >
            {REPRODUCTION_STATUS_LABELS[record.status] ?? record.status}
          </span>
        </div>

        {showAnimal && (
          <div className="text-xs text-muted-foreground">
            {record.animal.name
              ? `${record.animal.tag} · ${record.animal.name}`
              : record.animal.tag}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {format(new Date(record.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
        </div>

        {record.bullName && (
          <div className="text-xs text-muted-foreground">
            Touro: <span className="text-foreground">{record.bullName}</span>
          </div>
        )}

        {record.nextCheckDate && (
          <div className="text-xs text-muted-foreground">
            Próxima data:{' '}
            <span className="text-foreground">
              {format(new Date(record.nextCheckDate), "dd/MM/yyyy")}
            </span>
          </div>
        )}

        {record.notes && (
          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {record.notes}
          </div>
        )}
      </div>

      {/* Ação de exclusão */}
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-red-400"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  )
}
