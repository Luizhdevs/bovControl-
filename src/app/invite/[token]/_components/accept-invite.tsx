'use client'

import { useTransition } from 'react'
import { useRouter }     from 'next/navigation'
import { useToast }      from '@/hooks/use-toast'
import { acceptInvite }  from '@/modules/invites/actions'
import { Button }        from '@/components/ui/button'
import { CheckCircle, Loader2 } from 'lucide-react'

interface AcceptInviteProps {
  token:     string
  farmName:  string
  userEmail: string
}

export function AcceptInvite({ token, farmName, userEmail }: AcceptInviteProps) {
  const router         = useRouter()
  const { toast }      = useToast()
  const [isPending, start] = useTransition()

  function handleAccept() {
    start(async () => {
      const result = await acceptInvite(token)

      if (result.success) {
        toast({ title: `Bem-vindo(a) à ${farmName}!` })
        router.push('/')
      } else {
        toast({ title: 'Erro ao aceitar convite', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground text-center">
        Você entrará como: <span className="font-medium text-foreground">{userEmail}</span>
      </p>
      <Button className="w-full h-12 text-base font-semibold" disabled={isPending} onClick={handleAccept}>
        {isPending
          ? <><Loader2 className="size-5 animate-spin mr-2" /> Entrando...</>
          : <><CheckCircle className="size-5 mr-2" /> Aceitar convite</>}
      </Button>
    </div>
  )
}
