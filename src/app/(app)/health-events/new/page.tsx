import { auth }               from '@/lib/auth'
import { redirect }           from 'next/navigation'
import { prisma }             from '@/lib/prisma'
import { canAccess }          from '@/lib/permissions'
import { HealthEventForm }    from '@/modules/health-events/components/health-event-form'
import { PageHeader }         from '@/components/shared/page-header'

export const metadata = { title: 'Novo Evento de Saúde | BovControl' }

interface Props {
  searchParams: Promise<{ animalId?: string }>
}

export default async function NewHealthEventPage({ searchParams }: Props) {
  const { animalId: preselectedAnimalId } = await searchParams
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId } = farmUser

  const allowed = await canAccess(session.user.id, farmId, 'WORKER')
  if (!allowed) redirect('/health-events')

  // Carrega todos os animais ativos para o select
  const animals = await prisma.animal.findMany({
    where:   { farmId, status: 'ACTIVE' },
    select:  { id: true, tag: true, name: true, category: true },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take:    500,
  })

  const backHref   = preselectedAnimalId ? `/animals/${preselectedAnimalId}` : '/health-events'
  const redirectTo = preselectedAnimalId ? `/animals/${preselectedAnimalId}` : '/health-events'

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Registrar Evento de Saúde"
        backHref={backHref}
      />
      <HealthEventForm
        farmId={farmId}
        animals={animals}
        defaultValues={preselectedAnimalId ? { animalId: preselectedAnimalId } : undefined}
        redirectTo={redirectTo}
      />
    </div>
  )
}
