'use client'

import { useState, useTransition } from 'react'
import { useForm, Controller }     from 'react-hook-form'
import { zodResolver }             from '@hookform/resolvers/zod'
import { useToast }                from '@/hooks/use-toast'
import { createInvite }            from '../actions'
import { createInviteSchema, type CreateInviteInput } from '../schema'
import { Input }   from '@/components/ui/input'
import { Button }  from '@/components/ui/button'
import { Label }   from '@/components/ui/label'
import { UserPlus, Loader2, Copy, Check, ExternalLink } from 'lucide-react'

// ─── Role labels ──────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'WORKER',  label: 'Funcionário'  },
  { value: 'MANAGER', label: 'Gerente'      },
  { value: 'VIEWER',  label: 'Visualizador' },
] as const

// ─── Componente ───────────────────────────────────────────

interface InviteFormProps {
  farmId: string
}

export function InviteForm({ farmId }: InviteFormProps) {
  const { toast }           = useToast()
  const [isPending, start]  = useTransition()
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInviteInput>({
    resolver:      zodResolver(createInviteSchema),
    defaultValues: { email: '', role: 'WORKER' },
  })

  async function onSubmit(data: CreateInviteInput) {
    start(async () => {
      const result = await createInvite(farmId, data)

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      const url = `${window.location.origin}/invite/${result.data.token}`
      setInviteUrl(url)
      reset()
    })
  }

  function handleCopy() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleNewInvite() {
    setInviteUrl(null)
  }

  // ── Estado: link gerado ──────────────────────────────────
  if (inviteUrl) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-medium text-primary">✓ Convite criado! Compartilhe o link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 break-all leading-relaxed">
              {inviteUrl}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleCopy}>
              {copied
                ? <><Check className="size-3 mr-1" /> Copiado!</>
                : <><Copy className="size-3 mr-1" /> Copiar link</>}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-3"
              onClick={() => window.open(inviteUrl, '_blank')}
            >
              <ExternalLink className="size-3" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          O link expira em 7 dias.
        </p>
        <Button variant="ghost" size="sm" className="w-full" onClick={handleNewInvite}>
          Criar outro convite
        </Button>
      </div>
    )
  }

  // ── Estado: formulário ───────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">E-mail do convidado</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="colaborador@exemplo.com"
          style={{ fontSize: '16px' }}
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Perfil de acesso</Label>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={[
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-center',
                    field.value === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? <><Loader2 className="size-4 animate-spin mr-2" /> Gerando convite...</>
          : <><UserPlus className="size-4 mr-2" /> Criar convite</>}
      </Button>
    </form>
  )
}
