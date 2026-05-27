import { auth }     from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma }   from '@/lib/prisma'
import { Mail, ShieldAlert } from 'lucide-react'

export const metadata = { title: 'Acesso Restrito | BovControl' }

export default async function OnboardingPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Se o usuário JÁ tem uma fazenda, manda para o dashboard
  const farmUser = await prisma.farmUser.findFirst({
    where: { userId: session.user.id },
  })
  if (farmUser) redirect('/')

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-sm">
        <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center">
          <ShieldAlert className="size-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold">Acesso por convite</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O BovControl não permite criação de fazendas de forma independente.
            Para ter acesso, você precisa de um convite enviado por um administrador.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mail className="size-4 text-primary" />
            Como entrar?
          </div>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Solicite um convite ao administrador da sua fazenda</li>
            <li>Acesse o link enviado por e-mail</li>
            <li>Faça login com sua conta: <span className="font-medium text-foreground">{session.user.email}</span></li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">
          Logado como <span className="font-medium">{session.user.email}</span>
        </p>
      </div>
    </div>
  )
}
