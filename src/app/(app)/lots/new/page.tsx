import { auth }         from '@/lib/auth'
import { redirect }     from 'next/navigation'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }          from '@/components/shared/page-header'
import { LotForm }             from '@/modules/lots/components/lot-form'
import { getPasturesForSelect } from '@/modules/lots/queries'

export const metadata = { title: 'Novo Lote | BovControl' }

export default async function NewLotPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const farmId   = activeFarm.farmId
  const pastures = await getPasturesForSelect(farmId)

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/lots"
        title="Novo Lote"
        description="Crie um lote para organizar o rebanho"
      />

      <LotForm
        farmId={farmId}
        mode="create"
        pastures={pastures}
      />
    </div>
  )
}
