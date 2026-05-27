'use client'

import { useTransition } from 'react'
import { useToast }      from '@/hooks/use-toast'
import { revokeInvite }  from '../actions'
import { Button }        from '@/components/ui/button'
import { Loader2, X, Clock, CheckCircle2, Ban } from 'lucide-react'
import { format, isPast } from 'date-fns'
import { ptBR }           from 'date-fns/locale'
import type { InviteWithCreator } from '../types'

// ─── Labels ───────────────────────────────────────────────

const STATUS_CONFIG = {
  PENDING:  { icon: Clock,        label: 'Pendente',  className: 'text-amber-400' },
  ACCEPTED: { icon: CheckCircle2, label: 'Aceito',    className: 'text-green-400' },
  REVOKED:  { icon: Ban,          label: 'Revogado',  className: 'text-muted-foreground' },
  EXPIRED:  { icon: Clock,        label: 'Expirado',  className: 'text-destructive' },
} as const

const ROLE_LABELS: Record<string, string> = {
  OWNER:   'Proprietário',
  MANAGER: 'Gerente',
  WORKER:  'Funcionário',
  VIEWER:  'Visualizador',
}

// ─── Item ─────────────────────────────────────────────────

function InviteItem({ invite, farmId }: { invite: InviteWithCreator; farmId: string }) {
  const { toast }          = useToast()
  const [isPending, start] = useTransition()

  const isExpiredByDate    = invite.status === 'PENDING' && isPast(new Date(invite.expiresAt))
  const effectiveStatus    = isExpiredByDate ? 'EXPIRED' : invite.status
  const config             = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.PENDING
  const StatusIcon         = config.icon

  function handleRevoke() {
    start(async () => {
      const result = await revokeInvite(invite.id, farmId)
      if (result.success) toast({ title: 'Convite revogado' })
      else toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    })
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{invite.email}</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
            {ROLE_LABELS[invite.role] ?? invite.role}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <StatusIcon className={`size-3 ${config.className}`} />
          <span className={`text-xs ${config.className}`}>{config.label}</span>
          <span className="text-xs text-muted-foreground">
            · {format(new Date(invite.expiresAt), "dd/MM/yy", { locale: ptBR })}
          </span>
        </div>
      </div>

      {invite.status === 'PENDING' && !isExpiredByDate && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          title="Revogar convite"
          disabled={isPending}
          onClick={handleRevoke}
        >
          {isPending
            ? <Loader2 className="size-3 animate-spin" />
            : <X className="size-3" />}
        </Button>
      )}
    </div>
  )
}

// ─── Lista ────────────────────────────────────────────────

interface InviteListProps {
  invites: InviteWithCreator[]
  farmId:  string
}

export function InviteList({ invites, farmId }: InviteListProps) {
  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhum convite enviado ainda.
      </p>
    )
  }

  return (
    <div>
      {invites.map((invite) => (
        <InviteItem key={invite.id} invite={invite} farmId={farmId} />
      ))}
    </div>
  )
}
