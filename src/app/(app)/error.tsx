'use client'

import { useEffect } from 'react'
import { Button }    from '@/components/ui/button'
import { AlertTriangle, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  error:  Error & { digest?: string }
  reset:  () => void
}

/**
 * Error boundary da área autenticada (/app).
 * Mantém o layout (header + nav) intactos — só o conteúdo principal falhou.
 */
export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[AppError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 gap-4 text-center">
      <div className="size-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="size-7 text-destructive" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-lg font-bold">Erro ao carregar esta página</h2>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Você pode tentar novamente ou voltar ao dashboard.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-2 rounded-lg bg-muted p-3 text-xs text-left overflow-auto max-h-32 font-mono">
            {error.message}
          </pre>
        )}
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Tentar novamente
        </Button>
        <Button asChild>
          <Link href="/">
            <Home className="size-4 mr-1.5" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
