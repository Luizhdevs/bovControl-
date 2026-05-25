'use client'

import { useTransition }  from 'react'
import Link               from 'next/link'
import { Trash2, Loader2 } from 'lucide-react'
import { cn, formatLiters, formatDateTime } from '@/lib/utils'
import { MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'
import { useToast }        from '@/hooks/use-toast'
import { deleteMilkRecord } from '../actions'
import { SHIFT_EMOJIS, SHIFT_COLORS } from '../constants'
import type { MilkRecordWithAnimal } from '../types'

// ─── Componente ────────────────────────────────────────────

interface MilkRecordCardProps {
  record:      MilkRecordWithAnimal
  farmId:      string
  showAnimal?: boolean
  canDelete?:  boolean
}

export function MilkRecordCard({
  record,
  farmId,
  showAnimal = false,
  canDelete  = false,
}: MilkRecordCardProps) {
  const [isPending, start] = useTransition()
  const { toast }          = useToast()

  function handleDelete() {
    start(async () => {
      const result = await deleteMilkRecord(record.id, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Registro excluído.' })
    })
  }

  return (
    <div className="flex items-center gap-3 py-3">

      {/* Indicador de turno */}
      <div
        className={cn(
          'size-10 rounded-xl border flex items-center justify-center text-base shrink-0',
          SHIFT_COLORS[record.shift],
        )}
      >
        {SHIFT_EMOJIS[record.shift]}
      </div>

      {/* Informações */}
      <div className="flex-1 min-w-0">
        {showAnimal && (
          <Link
            href={`/milk/${record.animal.id}`}
            className="flex items-baseline gap-1 mb-0.5 hover:underline"
          >
            <span className="font-mono text-xs font-bold text-foreground">
              {record.animal.tag}
            </span>
            {record.animal.name && (
              <span className="text-xs text-muted-foreground truncate">
                · {record.animal.name}
              </span>
            )}
          </Link>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">
            {MILK_SHIFT_LABELS[record.shift]}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(record.recordedAt)}
          </span>
        </div>
      </div>

      {/* Litros */}
      <span className="text-base font-bold text-cyan-400 shrink-0">
        {formatLiters(record.liters)}
      </span>

      {/* Deletar (MANAGER) */}
      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={isPending}
          className={cn(
            'size-9 rounded-lg flex items-center justify-center shrink-0',
            'text-muted-foreground transition-colors',
            'hover:text-destructive hover:bg-destructive/10',
            'disabled:opacity-50',
          )}
          aria-label="Excluir registro"
        >
          {isPending
            ? <Loader2 className="size-4 animate-spin" />
            : <Trash2  className="size-4" />
          }
        </button>
      )}
    </div>
  )
}
