import { Suspense }     from 'react'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { auth }         from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { Dna, Target, Shuffle } from 'lucide-react'
import { PageHeader }   from '@/components/shared/page-header'
import { SectionCard }  from '@/components/shared/section-card'
import { EmptyState }   from '@/components/shared/empty-state'
import { getBullCatalog, getFarmBreedingGoal, getCatalogStats } from '@/modules/genetics/queries'
import { AddBullButton, EditBullButton, ArchiveBullButton }     from '@/modules/genetics/components/bull-catalog-actions'
import { BreedingGoalForm } from '@/modules/genetics/components/breeding-goal-form'

export const metadata = { title: 'Genética | BovControl' }

async function GeneticsContent({ farmId }: { farmId: string }) {
  const [bulls, goals, stats] = await Promise.all([
    getBullCatalog(farmId),
    getFarmBreedingGoal(farmId),
    getCatalogStats(farmId),
  ])

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-primary tabular-nums">{stats.count}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Touros no catálogo</div>
        </div>
        <Link
          href="/genetics/match"
          className="rounded-xl border border-border bg-card p-4 text-center hover:bg-muted/30 transition-colors"
        >
          <div className="flex justify-center mb-1">
            <Shuffle className="size-6 text-violet-500" />
          </div>
          <div className="text-xs text-muted-foreground">Ver acasalamentos</div>
        </Link>
      </div>

      {/* Catálogo de touros */}
      <SectionCard
        title="Catálogo de Sêmen / Touros"
        subtitle={`${stats.count} touro${stats.count !== 1 ? 's' : ''} cadastrado${stats.count !== 1 ? 's' : ''}`}
        noPadding
        actions={<AddBullButton farmId={farmId} />}
      >
        {bulls.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<Dna className="size-8 text-muted-foreground" />}
              title="Nenhum touro cadastrado"
              description="Cadastre touros com suas DEPs para começar a usar o sistema de acasalamento genético."
            />
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {bulls.map((bull) => {
              const depCount = [
                bull.depLeite, bull.depDesmame, bull.depParto, bull.depCcs, bull.depConformacao,
              ].filter(v => v !== null && v !== undefined).length

              return (
                <div
                  key={bull.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{bull.bullName}</span>
                      {bull.externalCode && (
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {bull.externalCode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[bull.race, bull.labName].filter(Boolean).join(' · ')}
                      {depCount > 0 && (
                        <span className="ml-2 text-primary/70">{depCount} DEPs cadastradas</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <EditBullButton farmId={farmId} bull={bull} />
                    <ArchiveBullButton farmId={farmId} bull={bull} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Metas de melhoramento */}
      <SectionCard
        title="Metas de Melhoramento"
        subtitle="Pesos usados no score de acasalamento"
        icon={<Target className="size-4 text-primary" />}
      >
        <BreedingGoalForm farmId={farmId} initial={goals} />
      </SectionCard>
    </div>
  )
}

export default async function GeneticsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Genética"
        description="Catálogo de sêmen e acasalamento genético"
        actions={
          <Link
            href="/genetics/match"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Shuffle className="size-4" />
            Acasalamentos
          </Link>
        }
      />
      <Suspense fallback={
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 rounded-xl border border-border bg-card animate-pulse" />
            <div className="h-20 rounded-xl border border-border bg-card animate-pulse" />
          </div>
          <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
        </div>
      }>
        <GeneticsContent farmId={activeFarm.farmId} />
      </Suspense>
    </div>
  )
}
