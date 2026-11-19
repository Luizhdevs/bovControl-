import { Suspense }    from 'react'
import { redirect }    from 'next/navigation'
import Link            from 'next/link'
import { auth }        from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma }      from '@/lib/prisma'
import { ArrowLeft, Dna } from 'lucide-react'
import { PageHeader }  from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState }  from '@/components/shared/empty-state'
import { getMatchResults } from '@/modules/genetics/queries'
import { MatchCard }   from '@/modules/genetics/components/match-card'
import { getFarmBreedingGoal } from '@/modules/genetics/queries'

export const metadata = { title: 'Acasalamentos | BovControl' }

async function MatchContent({ farmId }: { farmId: string }) {
  const [results, goals, cows] = await Promise.all([
    getMatchResults(farmId),
    getFarmBreedingGoal(farmId),
    prisma.animal.findMany({
      where:  { farmId, status: 'ACTIVE', sex: 'FEMALE', category: { in: ['COW', 'HEIFER'] } },
      select: { id: true, tag: true, name: true, category: true },
      orderBy: [{ category: 'asc' }, { tag: 'asc' }],
      take: 200,
    }),
  ])

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<Dna className="size-8 text-muted-foreground" />}
        title="Sem touros no catálogo"
        description="Cadastre touros com DEPs em Genética para ver o ranking de acasalamento."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Seletor de vaca */}
      <SectionCard
        title="Acasalamento para animal específico"
        subtitle="O ranking é calculado pelas metas da fazenda. Com DEPs da vaca, o score será personalizado."
      >
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
          {cows.map(cow => (
            <Link
              key={cow.id}
              href={`/genetics/match/${cow.id}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/40 hover:border-primary/40 transition-colors text-sm"
            >
              <span className="font-mono font-medium text-xs text-primary">{cow.tag}</span>
              {cow.name && <span className="text-muted-foreground truncate text-xs">{cow.name}</span>}
            </Link>
          ))}
        </div>
      </SectionCard>

      {/* Ranking geral */}
      <div>
        <div className="mb-3">
          <h2 className="font-semibold">Ranking geral — {results.length} touros</h2>
          <p className="text-xs text-muted-foreground">
            Score calculado pelas metas da fazenda. Selecione uma vaca acima para ranking personalizado.
          </p>
        </div>
        <div className="space-y-3">
          {results.map((result, i) => (
            <MatchCard key={result.bull.id} result={result} rank={i + 1} goals={goals} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function MatchPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Acasalamentos"
        description="Ranking de touros por compatibilidade genética"
        actions={
          <Link href="/genetics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Catálogo
          </Link>
        }
      />
      <Suspense fallback={
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      }>
        <MatchContent farmId={activeFarm.farmId} />
      </Suspense>
    </div>
  )
}
