import { Suspense } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

import { getAnimalsByFarm, getAnimalStats } from '@/modules/animals/queries'
import { AnimalList }    from '@/modules/animals/components/animal-list'
import { AnimalFilters } from '@/modules/animals/components/animal-filters'
import { PageHeader }    from '@/components/shared/page-header'
import { animalFiltersSchema } from '@/modules/animals/schema'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = {
  title: 'Animais | BovControl',
}

// ─── Props ─────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

// ─── Componente de stats inline ────────────────────────────

async function AnimalStatsBar({ farmId }: { farmId: string }) {
  const stats = await getAnimalStats(farmId)

  const items = [
    { label: 'Total',     value: stats.total,   color: 'text-foreground' },
    { label: 'Vacas',     value: stats.cows,    color: 'text-purple-400' },
    { label: 'Novilhas',  value: stats.heifers, color: 'text-blue-400'   },
    { label: 'Bezerros',  value: stats.calves,  color: 'text-green-400'  },
    { label: 'Touros',    value: stats.bulls,   color: 'text-red-400'    },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
      {items.map((item) => (
        <div key={item.label} className="shrink-0 text-center">
          <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-muted-foreground">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Lista assíncrona ──────────────────────────────────────

async function AnimalListAsync({
  farmId,
  searchParams,
}: {
  farmId:       string
  searchParams: Record<string, string>
}) {
  // Valida e sanitiza os filtros dos search params
  const filters = animalFiltersSchema.parse({
    search:   searchParams.search,
    sex:      searchParams.sex,
    category: searchParams.category,
    status:   searchParams.status   ?? 'ACTIVE',
    purpose:  searchParams.purpose,
    lotId:    searchParams.lotId,
  })

  const animals = await getAnimalsByFarm(farmId, filters)

  const isFiltered = Boolean(
    searchParams.search ||
    searchParams.sex    ||
    searchParams.category,
  )

  return <AnimalList animals={animals} isFiltered={isFiltered} />
}

// ─── Skeleton da lista ─────────────────────────────────────

function AnimalListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-[120px] rounded-xl bg-muted animate-pulse"
        />
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────

export default async function AnimalsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  // TODO: pegar farmId da sessão quando multi-fazenda ativo
  // Por ora, pega a primeira fazenda do usuário
  const { prisma } = await import('@/lib/prisma')
  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const farmId = farmUser.farmId
  const params = await searchParams

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Animais"
        actions={
          <Button asChild size="sm" className="h-9">
            <Link href="/animals/new">
              <Plus className="size-4 mr-1" />
              Novo
            </Link>
          </Button>
        }
      />

      {/* Stats rápidas */}
      <AnimalStatsBar farmId={farmId} />

      {/* Filtros */}
      <AnimalFilters />

      {/* Lista com streaming */}
      <Suspense fallback={<AnimalListSkeleton />}>
        <AnimalListAsync farmId={farmId} searchParams={params} />
      </Suspense>
    </div>
  )
}
