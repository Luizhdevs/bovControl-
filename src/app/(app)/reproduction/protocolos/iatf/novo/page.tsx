import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { ArrowLeft }     from 'lucide-react'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }    from '@/components/shared/page-header'
import { Button }        from '@/components/ui/button'
import { getAnimalsEligibleForIATF } from '@/modules/reproduction/iatf-queries'
import { NewIATFForm }               from './new-iatf-form'

export const metadata = { title: 'Novo Protocolo IATF | BovControl' }

export default async function NewIATFProtocolPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const animals = await getAnimalsEligibleForIATF(activeFarm.farmId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Novo Protocolo IATF"
        description="Inseminação Artificial em Tempo Fixo"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reproduction/protocolos/iatf">
              <ArrowLeft className="size-4 mr-1.5" />
              Voltar
            </Link>
          </Button>
        }
      />

      <NewIATFForm animals={animals} />
    </div>
  )
}
