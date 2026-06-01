import { redirect }              from 'next/navigation'
import { auth }                  from '@/lib/auth'
import { getActiveFarm }         from '@/lib/active-farm'
import { getOrCreateFarmSettings } from '@/modules/farm-settings/queries'
import { getProductionLotAnimals } from '@/modules/milk/queries'
import { MilkRegisterForm }      from '@/modules/milk/components/milk-register-form'
import { PageHeader }            from '@/components/shared/page-header'

export const metadata = { title: 'Registrar Ordenha | BovControl' }

export default async function MilkNewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const [settings, lotData] = await Promise.all([
    getOrCreateFarmSettings(activeFarm.farmId),
    getProductionLotAnimals(activeFarm.farmId),
  ])

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/milk"
        title="Registrar Ordenha"
        description="Nova sessão de produção"
      />

      <MilkRegisterForm
        farmId={activeFarm.farmId}
        redirectTo="/milk"
        productionAnimals={lotData.animals}
        lotName={lotData.lotName}
        enableParticipants={settings.enableMilkParticipants}
      />
    </div>
  )
}
