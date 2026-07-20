import { auth }          from '@/lib/auth'
import { redirect }      from 'next/navigation'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }    from '@/components/shared/page-header'
import { getTodayManagementOverview } from '@/modules/management/queries'
import { ManagementTodayClient }      from '@/modules/management/components/management-today-client'

export const metadata = { title: 'Manejo de Hoje | BovControl' }

export default async function ManagementTodayPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const { farmId } = activeFarm
  const overview   = await getTodayManagementOverview(farmId)

  const today = new Date()
  const dateLabel = today.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Manejo de Hoje"
        description={dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
      />
      <ManagementTodayClient overview={overview} />
    </div>
  )
}
