import { auth }         from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect }     from 'next/navigation'
import { prisma }       from '@/lib/prisma'
import { canAccess }    from '@/lib/permissions'
import { PastureForm }  from '@/modules/pastures/components/pasture-form'
import { PageHeader }   from '@/components/shared/page-header'

export const metadata = { title: 'Novo Pasto | BovControl' }

export default async function NewPasturePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const allowed = await canAccess(session.user.id, activeFarm.farmId, 'MANAGER')
  if (!allowed) redirect('/pastures')

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Novo Pasto"
        backHref="/pastures"
      />
      <PastureForm farmId={activeFarm.farmId} />
    </div>
  )
}
