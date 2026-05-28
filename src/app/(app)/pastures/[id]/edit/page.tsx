import { auth }           from '@/lib/auth'
import { redirect }       from 'next/navigation'
import { notFound }       from 'next/navigation'
import { getActiveFarm }  from '@/lib/active-farm'
import { canAccess }      from '@/lib/permissions'
import { getPastureById } from '@/modules/pastures/queries'
import { PastureForm }    from '@/modules/pastures/components/pasture-form'
import { PageHeader }     from '@/components/shared/page-header'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id }  = await params
  const session = await auth()
  if (!session) return { title: 'Editar Pasto | BovControl' }

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return { title: 'Editar Pasto | BovControl' }

  const pasture = await getPastureById(id, activeFarm.farmId)
  return { title: pasture ? `Editar ${pasture.name} | BovControl` : 'Pasto não encontrado' }
}

export default async function EditPasturePage({ params }: Props) {
  const { id }  = await params
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const [pasture, allowed] = await Promise.all([
    getPastureById(id, activeFarm.farmId),
    canAccess(session.user.id, activeFarm.farmId, 'MANAGER'),
  ])

  if (!pasture) notFound()
  if (!allowed) redirect('/pastures')

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title={`Editar: ${pasture.name}`}
        backHref="/pastures"
      />
      <PastureForm
        farmId={activeFarm.farmId}
        pastureId={pasture.id}
        defaultValues={{
          name:         pasture.name,
          areaHectares: pasture.areaHectares,
          grassType:    pasture.grassType,
          maxCapacity:  pasture.maxCapacity,
        }}
      />
    </div>
  )
}
