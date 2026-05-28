import { auth }            from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/prisma'
import { PageHeader }      from '@/components/shared/page-header'
import { getFeedTypesByFarm, getLotsWithActiveAnimalCount } from '@/modules/feed/queries'
import { FeedSessionForm } from '@/modules/feed/components/feed-session-form'

export const metadata = { title: 'Registrar Alimentação | BovControl' }

export default async function FeedNewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const [feedTypes, lots] = await Promise.all([
    getFeedTypesByFarm(farmId, true),   // somente ativos
    getLotsWithActiveAnimalCount(farmId),
  ])

  if (feedTypes.length === 0) {
    redirect('/feed-types/new')
  }

  return (
    <div className="space-y-5 pb-32">
      <PageHeader
        backHref="/feed"
        title="Registrar Alimentação"
        description="Distribui automaticamente entre os animais ativos do lote"
      />

      <FeedSessionForm
        farmId={farmId}
        lots={lots}
        feedTypes={feedTypes}
      />
    </div>
  )
}
