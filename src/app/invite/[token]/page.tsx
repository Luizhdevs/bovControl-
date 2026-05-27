import { auth }              from '@/lib/auth'
import { getInviteByToken }  from '@/modules/invites/queries'
import { AcceptInvite }      from './_components/accept-invite'
import { isPast }            from 'date-fns'
import { format }            from 'date-fns'
import { ptBR }              from 'date-fns/locale'
import Link                  from 'next/link'
import { Button }            from '@/components/ui/button'
import { AlertTriangle, Clock, CheckCircle2, Building2, LogIn } from 'lucide-react'

// Esta rota é PÚBLICA — acessível sem estar no grupo (app) ou (auth)
// mas precisa do layout raiz (apenas fornece html/body).

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invite    = await getInviteByToken(token)
  if (!invite) return { title: 'Convite Inválido | BovControl' }
  return { title: `Convite para ${invite.farm.name} | BovControl` }
}

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const [invite, session] = await Promise.all([
    getInviteByToken(token),
    auth(),
  ])

  // ── Token inválido ─────────────────────────────────────
  if (!invite) {
    return <InviteError icon={AlertTriangle} title="Convite inválido" message="Este link de convite não existe ou foi digitado incorretamente." />
  }

  // ── Já usado / revogado ────────────────────────────────
  if (invite.status === 'ACCEPTED') {
    return <InviteError icon={CheckCircle2} title="Convite já aceito" message="Este convite já foi utilizado. Se você precisa de acesso, solicite um novo convite ao administrador." />
  }
  if (invite.status === 'REVOKED') {
    return <InviteError icon={AlertTriangle} title="Convite revogado" message="Este convite foi cancelado pelo administrador. Solicite um novo convite." />
  }

  // ── Expirado ───────────────────────────────────────────
  if (isPast(new Date(invite.expiresAt))) {
    return <InviteError icon={Clock} title="Convite expirado" message={`Este convite expirou em ${format(new Date(invite.expiresAt), "dd/MM/yyyy", { locale: ptBR })}. Solicite um novo convite ao administrador.`} />
  }

  const ROLE_LABELS: Record<string, string> = {
    OWNER:   'Proprietário',
    MANAGER: 'Gerente',
    WORKER:  'Funcionário',
    VIEWER:  'Visualizador',
  }

  // ── Convite válido ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-4xl">🐄</div>
          <h1 className="text-2xl font-bold tracking-tight">BovControl</h1>
        </div>

        {/* Card do convite */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground text-center">Você foi convidado para</p>
            <div className="flex items-center justify-center gap-2">
              <Building2 className="size-5 text-primary" />
              <h2 className="text-xl font-bold">{invite.farm.name}</h2>
            </div>
            {(invite.farm.city || invite.farm.state) && (
              <p className="text-xs text-muted-foreground text-center">
                {[invite.farm.city, invite.farm.state].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-muted/50 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Perfil de acesso</span>
            <span className="text-sm font-medium">{ROLE_LABELS[invite.role] ?? invite.role}</span>
          </div>

          <div className="rounded-xl bg-muted/50 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Expira em</span>
            <span className="text-sm font-medium">
              {format(new Date(invite.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>

          {/* Ação */}
          {session ? (
            <AcceptInvite
              token={token}
              farmName={invite.farm.name}
              userEmail={session.user.email ?? ''}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                Faça login para aceitar o convite
              </p>
              <Button className="w-full h-12 text-base font-semibold" asChild>
                <Link href={`/login?callbackUrl=/invite/${token}`}>
                  <LogIn className="size-5 mr-2" />
                  Entrar para aceitar
                </Link>
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Este convite é destinado a {invite.email}
        </p>
      </div>
    </div>
  )
}

// ─── Componente de erro ────────────────────────────────────

function InviteError({
  icon: Icon,
  title,
  message,
}: {
  icon:    React.FC<{ className?: string }>
  title:   string
  message: string
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center">
          <Icon className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <Button variant="outline" asChild>
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    </div>
  )
}
