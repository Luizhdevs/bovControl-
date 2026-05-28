import { notFound, redirect } from 'next/navigation'
import { auth }                from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma }              from '@/lib/prisma'
import { PageHeader }          from '@/components/shared/page-header'
import { getLotById, getPasturesForSelect } from '@/modules/lots/queries'
import { LotForm }             from '@/modules/lots/components/lot-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }   = await params
  const session  = await auth()
  if (!session) return {}

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return {}

  const lot = await getLotById(id, activeFarm.farmId)
  return { title: lot ? `Editar ${lot.name} | BovControl` : 'Editar Lote | BovControl' }
}

export default async function EditLotPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id }   = await params
  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const [lot, pastures] = await Promise.all([
    getLotById(id, farmId),
    getPasturesForSelect(farmId),
  ])

  if (!lot) notFound()

  return (
    <div className="space-y-5">
      <PageHeader
        backHref={`/lots/${id}`}
        title="Editar Lote"
        description={lot.name}
      />

      <LotForm
        farmId={farmId}
        mode="edit"
        lot={lot}
        pastures={pastures}
      />
    </div>
  )
}
