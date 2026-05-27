import { auth }            from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { prisma }          from '@/lib/prisma'
import Link                from 'next/link'
import { Plus, Wheat }     from 'lucide-react'
import { PageHeader }      from '@/components/shared/page-header'
import { getFeedTypesByFarm } from '@/modules/feed/queries'
import { FeedTypeCard }    from '@/modules/feed/components/feed-type-card'

export const metadata = { title: 'Tipos de Ração | BovControl' }

export default async function FeedTypesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true, role: true },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId, role } = farmUser
  const canEdit = ['OWNER', 'MANAGER'].includes(role)

  const feedTypes = await getFeedTypesByFarm(farmId)

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Tipos de Ração"
        description="Cadastro de rações e concentrados"
        actions={
          canEdit ? (
            <Link
              href="/feed-types/new"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" />
              Novo tipo
            </Link>
          ) : undefined
        }
      />

      {feedTypes.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-3 text-center rounded-xl border border-dashed border-border">
          <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
            <Wheat className="size-6 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum tipo de ração cadastrado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cadastre os tipos de ração utilizados na fazenda
            </p>
          </div>
          {canEdit && (
            <Link
              href="/feed-types/new"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" />
              Cadastrar ração
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {feedTypes.map((ft) => (
            <FeedTypeCard
              key={ft.id}
              feedType={ft}
              farmId={farmId}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}
