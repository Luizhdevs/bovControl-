import { Suspense }    from 'react'
import { redirect, notFound } from 'next/navigation'
import Link            from 'next/link'
import { auth }        from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma }      from '@/lib/prisma'
import { ArrowLeft }   from 'lucide-react'
import { PageHeader }  from '@/components/shared/page-header'
import { EmptyState }  from '@/components/shared/empty-state'
import { getMatchResults, getFarmBreedingGoal } from '@/modules/genetics/queries'
import { MatchCard }   from '@/modules/genetics/components/match-card'

interface Props {
  params: Promise<{ animalId: string }>
}

async function AnimalMatchContent({
  farmId,
  animalId,
}: {
  farmId: string
  animalId: string
}) {
  const [animal, results, goals] = await Promise.all([
    prisma.animal.findFirst({
      where:  { id: animalId, farmId, status: 'ACTIVE' },
      select: {
        id: true, tag: true, name: true, category: true,
        lastCalvingDate: true, milkStatus: true, parityNumber: true,
      },
    }),
    getMatchResults(farmId),
    getFarmBreedingGoal(farmId),
  ])

  if (!animal) notFound()

  if (results.length === 0) {
    return (
      <EmptyState
        icon={<span className="text-2xl">🧬</span>}
        title="Sem touros no catálogo"
        description="Cadastre touros com DEPs em Genética para ver o ranking de acasalamento."
      />
    )
  }

  const categoryLabel = animal.category === 'COW' ? 'Vaca' : 'Novilha'

  return (
    <div className="space-y-4">
      {/* Info do animal */}
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono font-bold text-primary">{animal.tag}</span>
            {animal.name && <span className="ml-2 text-muted-foreground">{animal.name}</span>}
          </div>
          <span className="text-xs text-muted-foreground">{categoryLabel}</span>
        </div>
        {animal.parityNumber !== null && animal.parityNumber !== undefined && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {animal.parityNumber} parto{animal.parityNumber !== 1 ? 's' : ''}
            {animal.lastCalvingDate && (
              <> · último parto {new Date(animal.lastCalvingDate).toLocaleDateString('pt-BR')}</>
            )}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          Score calculado pelas metas da fazenda. DEPs individuais desta vaca não cadastradas — fase 2.
        </p>
      </div>

      {/* Ranking */}
      <div>
        <h2 className="font-semibold mb-1">
          {results.length} touro{results.length !== 1 ? 's' : ''} rankeado{results.length !== 1 ? 's' : ''}
        </h2>
        <div className="space-y-3">
          {results.map((result, i) => (
            <MatchCard key={result.bull.id} result={result} rank={i + 1} goals={goals} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function AnimalMatchPage({ params }: Props) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const { animalId } = await params

  const animal = await prisma.animal.findFirst({
    where:  { id: animalId, farmId: activeFarm.farmId },
    select: { tag: true, name: true },
  })

  const title = animal
    ? `${animal.tag}${animal.name ? ` · ${animal.name}` : ''}`
    : 'Animal'

  return (
    <div className="space-y-4">
      <PageHeader
        title="Acasalamento"
        description={title}
        actions={
          <Link href="/genetics/match" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Todos os animais
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
        <AnimalMatchContent farmId={activeFarm.farmId} animalId={animalId} />
      </Suspense>
    </div>
  )
}
