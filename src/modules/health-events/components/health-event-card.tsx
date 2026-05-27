'use client'

import { useTransition }    from 'react'
import { resolveHealthEvent, deleteHealthEvent } from '../actions'
import {
  HEALTH_EVENT_LABELS,
  HEALTH_EVENT_COLORS,
  HEALTH_EVENT_ICONS,
  type HealthEventItem,
} from '../types'
import { Button }           from '@/components/ui/button'
import { useToast }         from '@/hooks/use-toast'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { format }           from 'date-fns'
import { ptBR }             from 'date-fns/locale'
import Link                 from 'next/link'

interface Props {
  event:        HealthEventItem
  farmId:       string
  canManage:    boolean
  showAnimal?:  boolean
}

export function HealthEventCard({
  event,
  farmId,
  canManage,
  showAnimal = false,
}: Props) {
  const { toast }                    = useToast()
  const [isPending, startTransition] = useTransition()

  const colorClasses = HEALTH_EVENT_COLORS[event.type].split(' ')
  const textColor    = colorClasses[0]
  const bgColor      = colorClasses[1]
  const borderColor  = colorClasses[2]

  const handleResolve = () => {
    startTransition(async () => {
      const result = await resolveHealthEvent(event.id, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteHealthEvent(event.id, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <div className={`
      rounded-xl border p-4 space-y-2.5
      ${event.resolved
        ? 'border-border bg-card/50 opacity-70'
        : `${borderColor} ${bgColor}`}
    `}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{HEALTH_EVENT_ICONS[event.type]}</span>
          <div className="min-w-0">
            <span className={`text-xs font-semibold uppercase tracking-wide ${textColor}`}>
              {HEALTH_EVENT_LABELS[event.type]}
            </span>
            {showAnimal && (
              <Link
                href={`/animals/${event.animalId}`}
                className="block text-xs text-muted-foreground hover:text-foreground truncate"
              >
                {event.animal.tag}{event.animal.name ? ` · ${event.animal.name}` : ''}
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.resolved && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="size-3" />
              Resolvido
            </span>
          )}
          <time className="text-xs text-muted-foreground">
            {format(event.occurredAt, "d 'de' MMM", { locale: ptBR })}
          </time>
        </div>
      </div>

      {/* Descrição */}
      <p className="text-sm">{event.description}</p>

      {/* Medicação */}
      {event.medication && (
        <p className="text-xs text-muted-foreground">
          💊 {event.medication}
        </p>
      )}

      {/* Custo */}
      {event.cost != null && (
        <p className="text-xs text-muted-foreground">
          R$ {event.cost.toFixed(2).replace('.', ',')}
        </p>
      )}

      {/* Notas */}
      {event.notes && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">
          {event.notes}
        </p>
      )}

      {/* Ações */}
      {canManage && !event.resolved && (
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1 text-green-400 border-green-500/30 hover:bg-green-500/5"
            onClick={handleResolve}
            disabled={isPending}
          >
            <CheckCircle2 className="size-3" />
            Resolver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}

      {/* Só delete para resolvidos */}
      {canManage && event.resolved && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
