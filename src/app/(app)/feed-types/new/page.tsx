import { auth }          from '@/lib/auth'
import { redirect }      from 'next/navigation'
import { prisma }        from '@/lib/prisma'
import { PageHeader }    from '@/components/shared/page-header'
import { FeedTypeForm }  from '@/modules/feed/components/feed-type-form'

export const metadata = { title: 'Nova Ração | BovControl' }

export default async function FeedTypeNewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true, role: true },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId, role } = farmUser
  if (!['OWNER', 'MANAGER'].includes(role)) redirect('/feed-types')

  return (
    <div className="space-y-5 pb-32">
      <PageHeader
        backHref="/feed-types"
        title="Nova Ração"
        description="Cadastre um tipo de ração ou concentrado"
      />
      <FeedTypeForm farmId={farmId} />
    </div>
  )
}
