'use client'

/**
 * Página de gerenciamento da fila offline.
 *
 * Permite ao usuário:
 * - Ver sessões que falharam definitivamente
 * - Tentar reenviar manualmente (retry)
 * - Descartar sessões com erro
 * - Limpar sessões já sincronizadas
 */

import { useTransition } from 'react'
import { useMilkQueue }  from '@/stores/milk-queue'
import { PageHeader }    from '@/components/shared/page-header'
import { Button }        from '@/components/ui/button'
import { formatLiters }  from '@/lib/utils'
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Trash2,
  WifiOff,
  Inbox,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SHIFT_LABELS = { MORNING: 'Manhã', AFTERNOON: 'Tarde' } as const

export default function OfflinePage() {
  const [, startTransition] = useTransition()

  const queue       = useMilkQueue((s) => s.queue)
  const retry       = useMilkQueue((s) => s.retry)
  const remove      = useMilkQueue((s) => s.remove)
  const clearSynced = useMilkQueue((s) => s.clearSynced)

  const deadLetterItems = queue.filter((i) => i.status === 'dead-letter')
  const failedItems     = queue.filter((i) => i.status === 'failed')
  const syncedItems     = queue.filter((i) => i.status === 'synced')
  const pendingItems    = queue.filter((i) => i.status === 'pending' || i.status === 'syncing')

  const hasAnything = queue.length > 0

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Fila Offline"
        description="Sessões de ordenha aguardando sincronização"
        backHref="/"
      />

      {/* Resumo */}
      {hasAnything && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Com erro',       count: deadLetterItems.length, color: 'text-destructive'      },
            { label: 'Falhados',       count: failedItems.length,     color: 'text-amber-400'        },
            { label: 'Pendentes',      count: pendingItems.length,    color: 'text-muted-foreground' },
            { label: 'Sincronizados',  count: syncedItems.length,     color: 'text-green-400'        },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-3">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.count}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Limpar sincronizados */}
      {syncedItems.length > 0 && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-green-400 shrink-0" />
            <span className="text-sm text-green-400">
              {syncedItems.length} sessão{syncedItems.length !== 1 ? 'ões' : ''} sincronizada{syncedItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => clearSynced())}
            className="text-green-400 hover:text-green-300 shrink-0"
          >
            Limpar
          </Button>
        </div>
      )}

      {/* Dead-letter */}
      {deadLetterItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="size-4" />
            Sessões com erro definitivo
          </h2>
          <p className="text-xs text-muted-foreground">
            Estas sessões falharam após múltiplas tentativas. Você pode tentar novamente ou descartar.
          </p>
          <div className="space-y-2">
            {deadLetterItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {SHIFT_LABELS[item.shift]} · {item.date}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatLiters(item.totalLiters)} · {item.milkingCows} vacas
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Enfileirado em{' '}
                  {format(parseISO(item.createdAt), "d 'de' MMM, HH:mm", { locale: ptBR })}
                </div>
                {item.lastError && (
                  <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-2 py-1 font-mono break-all">
                    {item.lastError}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startTransition(() => retry(item.id))}
                    className="flex-1 gap-1 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <RotateCcw className="size-3" />
                    Tentar novamente
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startTransition(() => remove(item.id))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Falhados (com retry automático pendente) */}
      {failedItems.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <WifiOff className="size-4" />
            Aguardando reconexão ({failedItems.length})
          </h2>
          <div className="space-y-2">
            {failedItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    {SHIFT_LABELS[item.shift]} · {item.date}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatLiters(item.totalLiters)} · {item.milkingCows} vacas ·{' '}
                    Tentativa {item.retryCount}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startTransition(() => remove(item.id))}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Estado vazio */}
      {!hasAnything && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Inbox className="size-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium">Fila vazia</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as sessões foram sincronizadas com sucesso.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
