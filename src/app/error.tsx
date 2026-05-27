'use client'

import { useEffect } from 'react'
import { Button }    from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface Props {
  error:  Error & { digest?: string }
  reset:  () => void
}

/**
 * Error boundary global (Next.js App Router).
 * Captura erros não tratados em qualquer rota.
 */
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    // Log para serviço de observabilidade (Sentry, etc.)
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="flex justify-center">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="size-8 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
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
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
            <Button onClick={reset}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
