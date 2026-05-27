import { auth }           from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma }         from '@/lib/prisma'
import { PageHeader }     from '@/components/shared/page-header'
import { getFeedTypeById } from '@/modules/feed/queries'
import { FeedTypeForm }   from '@/modules/feed/components/feed-type-form'

export const metadata = { title: 'Editar Ração | BovControl' }

export default async function FeedTypeEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true, role: true },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId, role } = farmUser
  if (!['OWNER', 'MANAGER'].includes(role)) redirect('/feed-types')

  const feedType = await getFeedTypeById(id, farmId)
  if (!feedType) notFound()

  return (
    <div className="space-y-5 pb-32">
      <PageHeader
        backHref="/feed-types"
        title="Editar Ração"
        description={feedType.name}
      />
      <FeedTypeForm farmId={farmId} initial={feedType} />
    </div>
  )
}
