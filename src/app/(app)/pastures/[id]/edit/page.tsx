import { auth }            from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { notFound }        from 'next/navigation'
import { prisma }          from '@/lib/prisma'
import { canAccess }       from '@/lib/permissions'
import { getPastureById }  from '@/modules/pastures/queries'
import { PastureForm }     from '@/modules/pastures/components/pasture-form'
import { PageHeader }      from '@/components/shared/page-header'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id }  = await params
  const session = await auth()
  if (!session) return { title: 'Editar Pasto | BovControl' }

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) return { title: 'Editar Pasto | BovControl' }

  const pasture = await getPastureById(id, farmUser.farmId)
  return { title: pasture ? `Editar ${pasture.name} | BovControl` : 'Pasto não encontrado' }
}

export default async function EditPasturePage({ params }: Props) {
  const { id }  = await params
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const [pasture, allowed] = await Promise.all([
    getPastureById(id, farmUser.farmId),
    canAccess(session.user.id, farmUser.farmId, 'MANAGER'),
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
        farmId={farmUser.farmId}
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
