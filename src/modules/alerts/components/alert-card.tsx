'use client'

import { useTransition } from 'react'
import { useToast }      from '@/hooks/use-toast'
import { resolveAlert, dismissAlert } from '../actions'
import { Button }        from '@/components/ui/button'
import { CheckCircle, X, Loader2, PawPrint, CalendarDays } from 'lucide-react'
import { format }        from 'date-fns'
import { ptBR }          from 'date-fns/locale'
import type { AlertWithAnimal } from '../types'

// ─── Labels e estilos ─────────────────────────────────────

const PRIORITY_STYLES = {
  HIGH:   { border: 'border-l-red-500',   badge: 'bg-red-500/10 text-red-400 border-red-500/20',     label: 'Alta'  },
  MEDIUM: { border: 'border-l-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', label: 'Média' },
  LOW:    { border: 'border-l-blue-500',  badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',   label: 'Baixa' },
} as const

const ALERT_TYPE_LABELS: Record<string, string> = {
  HEAT:             'Cio',
  PREGNANCY_CHECK:  'Diagnóstico',
  DRY_OFF:          'Secagem',
  CALVING:          'Parto previsto',
  VACCINATION:      'Vacinação',
  WEIGHT_CHECK:     'Pesagem',
}

// ─── Componente ───────────────────────────────────────────

interface AlertCardProps {
  alert:  AlertWithAnimal
  farmId: string
}

export function AlertCard({ alert, farmId }: AlertCardProps) {
  const { toast }                              = useToast()
  const [isResolvePending, startResolve]       = useTransition()
  const [isDismissPending, startDismiss]       = useTransition()

  const priority  = PRIORITY_STYLES[alert.priority] ?? PRIORITY_STYLES.MEDIUM
  const isPending = alert.status === 'PENDING'

  function handleResolve() {
    startResolve(async () => {
      const result = await resolveAlert(alert.id, farmId)
      if (result.success) toast({ title: 'Alerta resolvido!' })
      else toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    })
  }

  function handleDismiss() {
    startDismiss(async () => {
      const result = await dismissAlert(alert.id, farmId)
      if (result.success) toast({ title: 'Alerta ignorado' })
      else toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    })
  }

  return (
    <div className={`rounded-xl border border-border bg-card border-l-4 ${priority.border} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${priority.badge}`}>
              {priority.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {ALERT_TYPE_LABELS[alert.type] ?? alert.type}
            </span>
          </div>
          <p className="font-medium text-sm mt-1 leading-snug">{alert.title}</p>
          {alert.description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {alert.animal && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
              <PawPrint className="size-3 shrink-0" />
              <span className="font-mono">{alert.animal.tag}</span>
              {alert.animal.name && <span className="truncate">· {alert.animal.name}</span>}
            </span>
          )}
          {alert.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <CalendarDays className="size-3" />
              {format(new Date(alert.dueDate), 'dd/MM/yy', { locale: ptBR })}
            </span>
          )}
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              title="Ignorar"
              disabled={isDismissPending || isResolvePending}
              onClick={handleDismiss}
            >
              {isDismissPending
                ? <Loader2 className="size-3 animate-spin" />
                : <X className="size-3" />}
            </Button>
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              disabled={isResolvePending || isDismissPending}
              onClick={handleResolve}
            >
              {isResolvePending
                ? <Loader2 className="size-3 animate-spin" />
                : <CheckCircle className="size-3 mr-1" />}
              Resolver
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
