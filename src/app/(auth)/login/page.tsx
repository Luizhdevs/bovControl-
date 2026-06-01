'use client'

import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [isPending, start]      = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    start(async () => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError('Email ou senha inválidos')
      } else {
        router.push('/')
        router.refresh()
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🐄</div>
          <h1 className="text-2xl font-bold">BovControl</h1>
          <p className="text-sm text-muted-foreground">Gestão pecuária inteligente</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 text-base"
              style={{ fontSize: '16px' }}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 text-base"
              style={{ fontSize: '16px' }}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Entrar
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Fazenda Saldanha · Uberaba, MG
        </p>
      </div>
    </div>
  )
}
