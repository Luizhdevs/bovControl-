'use client'

/**
 * SyncProvider — gerencia sincronização automática da fila offline.
 *
 * Estratégias:
 * - Sincroniza quando navigator.onLine muda para true
 * - Sincroniza quando novos itens 'pending' são adicionados à fila (online)
 * - Processamento em lotes de CONCURRENCY itens simultâneos
 * - BroadcastChannel previne que múltiplas abas sincronizem ao mesmo tempo
 * - Erros de domínio vão para dead-letter imediatamente (sem retries inúteis)
 * - Erros de rede: retries com MAX_RETRIES limit → dead-letter
 * - Itens presos em 'syncing' (page reload durante sync) são revertidos no mount
 *
 * Renderiza null — apenas gerencia efeitos colaterais.
 */

import { useEffect, useRef } from 'react'
import { useMilkQueue, type MilkQueueItem } from '@/stores/milk-queue'
import { registerMilkingSession } from '@/modules/milk/actions'

const CHANNEL_NAME = 'bovcontrol-sync'
const CONCURRENCY  = 3

export function SyncProvider() {
  const isSyncing  = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Selectors estáveis do Zustand — não causam re-render
  const markSyncing    = useMilkQueue((s) => s.markSyncing)
  const markSynced     = useMilkQueue((s) => s.markSynced)
  const markFailed     = useMilkQueue((s) => s.markFailed)
  const markDeadLetter = useMilkQueue((s) => s.markDeadLetter)

  // Contador de itens 'pending' — causa re-render quando novos itens chegam
  const pendingCount = useMilkQueue((s) =>
    s.queue.filter((i) => i.status === 'pending').length,
  )

  // ── Core sync ─────────────────────────────────────────────────

  async function processItems(items: MilkQueueItem[]) {
    if (isSyncing.current)  return
    if (items.length === 0) return
    if (!navigator.onLine)  return

    channelRef.current?.postMessage({ type: 'SYNC_STARTED' })
    isSyncing.current = true

    try {
      // Processa em lotes — controle de concorrência
      for (let i = 0; i < items.length; i += CONCURRENCY) {
        const batch = items.slice(i, i + CONCURRENCY)

        // Promise.allSettled — uma falha não cancela o resto do lote
        await Promise.allSettled(
          batch.map(async (item) => {
            markSyncing(item.id)
            try {
              const result = await registerMilkingSession(item.farmId, {
                shift:          item.shift,
                date:           new Date(item.date),
                totalLiters:    item.totalLiters,
                milkingCows:    item.milkingCows,
                notes:          item.notes,
                idempotencyKey: item.idempotencyKey,
              })

              if (result.success) {
                markSynced(item.id)
              } else if (result.kind === 'domain') {
                // Erro de domínio — não vai melhorar com retry: dead-letter
                markDeadLetter(item.id, result.error)
              } else {
                // Erro de rede/servidor: incrementa retryCount
                markFailed(item.id, result.error ?? 'Falha ao sincronizar')
              }
            } catch (e) {
              markFailed(item.id, e instanceof Error ? e.message : 'Erro desconhecido')
            }
          }),
        )
      }
    } finally {
      isSyncing.current = false
      channelRef.current?.postMessage({ type: 'SYNC_ENDED' })

      // Itens adicionados DURANTE esta rodada ficaram bloqueados — processa agora
      if (navigator.onLine) {
        const remaining = useMilkQueue.getState().queue.filter((i) => i.status === 'pending')
        if (remaining.length > 0) {
          setTimeout(() => processItems(remaining), 50)
        }
      }
    }
  }

  // ── Mount: recuperação + BroadcastChannel + online listener ──

  useEffect(() => {
    // Reseta itens presos em 'syncing' de sessão anterior (page reload)
    const stuck = useMilkQueue.getState().queue.filter((i) => i.status === 'syncing')
    for (const item of stuck) {
      markFailed(item.id, 'Sync interrompido (página recarregada)')
    }

    // Coordenação multi-tab
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME)
      channelRef.current.onmessage = ({ data }: MessageEvent<{ type: string }>) => {
        if (data.type === 'SYNC_STARTED') isSyncing.current = true
        if (data.type === 'SYNC_ENDED')   isSyncing.current = false
      }
    }

    const onOnline = () => {
      // Inclui 'failed' no retry de reconexão
      const items = useMilkQueue.getState().queue.filter(
        (i) => i.status === 'pending' || i.status === 'failed',
      )
      processItems(items)
    }

    window.addEventListener('online', onOnline)
    onOnline()   // tenta sync no mount

    return () => {
      window.removeEventListener('online', onOnline)
      channelRef.current?.close()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync reativo: novos itens enquanto online ─────────────────

  useEffect(() => {
    if (pendingCount > 0 && typeof window !== 'undefined' && navigator.onLine) {
      const items = useMilkQueue.getState().queue.filter((i) => i.status === 'pending')
      processItems(items)
    }
  }, [pendingCount]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
