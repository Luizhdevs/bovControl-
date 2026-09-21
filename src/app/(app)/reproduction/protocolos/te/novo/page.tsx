import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { ArrowLeft }     from 'lucide-react'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }    from '@/components/shared/page-header'
import { Button }        from '@/components/ui/button'
import { getAnimalsEligibleForTE } from '@/modules/reproduction/te-queries'
import { NewProtocolForm }         from './new-protocol-form'

export const metadata = { title: 'Novo Protocolo TE | BovControl' }

export default async function NewTEProtocolPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const animals = await getAnimalsEligibleForTE(activeFarm.farmId)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Novo Protocolo TE"
        description="Configure e selecione as receptoras"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reproduction/protocolos/te">
              <ArrowLeft className="size-4 mr-1.5" />
              Voltar
            </Link>
          </Button>
        }
      />

      <NewProtocolForm animals={animals} />
    </div>
  )
}
