'use client'

/**
 * Indicador de status offline/sync.
 * Renderiza null quando não há nada a mostrar (online + nenhum item pendente).
 */

import { useEffect, useState } from 'react'
import { useMilkQueue }        from '@/stores/milk-queue'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export function SyncIndicator() {
  // Estado online inicializado como true (SSR) — corrigido em useEffect
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const toOnline  = () => setIsOnline(true)
    const toOffline = () => setIsOnline(false)
    window.addEventListener('online',  toOnline)
    window.addEventListener('offline', toOffline)
    return () => {
      window.removeEventListener('online',  toOnline)
      window.removeEventListener('offline', toOffline)
    }
  }, [])

  const isSyncing  = useMilkQueue((s) => s.queue.some((i) => i.status === 'syncing'))
  const pending    = useMilkQueue((s) => s.queue.filter((i) => i.status === 'pending' || i.status === 'failed').length)
  const deadLetter = useMilkQueue((s) => s.queue.filter((i) => i.status === 'dead-letter').length)

  // Nada a mostrar: online, sync idle, sem dead-letter
  if (isOnline && !isSyncing && pending === 0 && deadLetter === 0) return null

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* Offline + itens na fila — clicável para ver detalhes */}
      {!isOnline && (
        <Link
          href="/offline"
          className="flex items-center gap-1 text-amber-400 hover:underline"
        >
          <WifiOff className="size-3" />
          Offline
          {pending > 0 && (
            <span className="ml-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 font-medium">
              {pending}
            </span>
          )}
        </Link>
      )}

      {/* Sincronizando */}
      {isOnline && isSyncing && (
        <span className="flex items-center gap-1 text-blue-400">
          <RefreshCw className="size-3 animate-spin" />
          Sincronizando
        </span>
      )}

      {/* Pendentes sem syncing ativo — clicável para ver detalhes */}
      {isOnline && !isSyncing && pending > 0 && (
        <Link
          href="/offline"
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          <Wifi className="size-3" />
          <span className="rounded-full bg-muted px-1.5 py-0.5">{pending}</span>
        </Link>
      )}

      {/* Dead-letter: clicável para ir até /offline */}
      {deadLetter > 0 && (
        <Link
          href="/offline"
          className="flex items-center gap-1 text-destructive hover:underline"
        >
          <AlertTriangle className="size-3" />
          {deadLetter} erro{deadLetter !== 1 ? 's' : ''}
        </Link>
      )}
    </div>
  )
}
