import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import { getReproductionHistory } from '@/modules/reproduction/queries'
import { ReproductionCard } from '@/modules/reproduction/components/reproduction-card'
import { ReproductionFilters } from '@/modules/reproduction/components/reproduction-filters'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = { title: 'Histórico Reprodutivo | BovControl' }

// ─── Page ──────────────────────────────────────────────────

export default async function ReproductionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; type?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm
  const canDelete        = ['OWNER', 'MANAGER'].includes(role)

  const params      = await searchParams
  const rawDays     = parseInt(params.days ?? '30', 10)
  const days        = Number.isFinite(rawDays) ? Math.min(365, Math.max(7, rawDays)) : 30
  const filterType  = params.type   ?? ''
  const filterStatus = params.status ?? ''

  let records = await getReproductionHistory(farmId, days)

  // Filtros em memória (volume baixo — take:200 no query)
  if (filterType)   records = records.filter((r) => r.type   === filterType)
  if (filterStatus) records = records.filter((r) => r.status === filterStatus)

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        backHref="/reproduction"
        title="Histórico"
        description={`${records.length} eventos nos últimos ${days} dias`}
      />

      <ReproductionFilters
        currentDays={days}
        currentType={filterType}
        currentStatus={filterStatus}
      />

      <SectionCard
        title="Eventos"
        subtitle={`${records.length} ${records.length === 1 ? 'registro' : 'registros'}`}
        noPadding
      >
        {records.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<span className="text-2xl">🔬</span>}
              title="Sem registros"
              description="Nenhum evento reprodutivo encontrado para este período."
            />
          </div>
        ) : (
          <div className="px-4 divide-y divide-border/40">
            {records.map((record) => (
              <ReproductionCard
                key={record.id}
                record={record}
                farmId={farmId}
                showAnimal
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
