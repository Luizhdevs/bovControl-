import { redirect }        from 'next/navigation'
import Link               from 'next/link'
import { auth }           from '@/lib/auth'
import { getActiveFarm }  from '@/lib/active-farm'
import { canAccess }      from '@/lib/permissions'
import { prisma }         from '@/lib/prisma'
import { PageHeader }     from '@/components/shared/page-header'
import { ArrowLeft }      from 'lucide-react'
import { VaccinationBulkForm } from '@/modules/health-events/components/vaccination-bulk-form'

export const metadata = { title: 'Vacinação em Massa | BovControl' }

export default async function VaccinationBulkPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const allowed = await canAccess(session.user.id, farmId, 'WORKER')
  if (!allowed) redirect('/health-events')

  const animals = await prisma.animal.findMany({
    where:   { farmId, status: 'ACTIVE' },
    select:  {
      id:       true,
      tag:      true,
      name:     true,
      category: true,
      lot:      { select: { name: true } },
    },
    orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    take:    1000,
  })

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Vacinação em Massa"
        description={`${animals.length} animais disponíveis`}
        actions={
          <Link
            href="/health-events"
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        }
      />

      <VaccinationBulkForm farmId={farmId} animals={animals} />
    </div>
  )
}
