'use client'

import { useTransition, useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { migrateLegacyTEProtocol } from '@/modules/reproduction/te-actions'

export function MigrateButton() {
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)
  const router = useRouter()

  function handleMigrate() {
    setError(null)
    startTransition(async () => {
      const result = await migrateLegacyTEProtocol()
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error ?? 'Erro na migração')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-sm font-medium mb-1">Protocolo TE Set/2026</div>
      <p className="text-xs text-muted-foreground mb-3">
        Dados importados via script. Clique para vincular ao novo sistema de protocolos.
      </p>
      {error && <p className="text-xs text-destructive mb-2">{error}</p>}
      <button
        onClick={handleMigrate}
        disabled={pending}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
      >
        {pending
          ? <Loader2 className="size-3.5 animate-spin" />
          : <Download className="size-3.5" />}
        Importar protocolo existente
      </button>
    </div>
  )
}
