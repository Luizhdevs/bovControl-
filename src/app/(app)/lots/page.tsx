import { Suspense }    from 'react'
import Link            from 'next/link'
import { auth }        from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect }    from 'next/navigation'
import { Button }      from '@/components/ui/button'
import { Plus }        from 'lucide-react'

import { getLotsByFarm }   from '@/modules/lots/queries'
import { LotCard }         from '@/modules/lots/components/lot-card'
import { LotFilters }      from '@/modules/lots/components/lot-filters'
import { PageHeader }      from '@/components/shared/page-header'
import { EmptyState }      from '@/components/shared/empty-state'
import { lotFiltersSchema } from '@/modules/lots/schema'
import { Layers2 }         from 'lucide-react'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = { title: 'Lotes | BovControl' }

// ─── Props ─────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

// ─── Stats rápidas da listagem ─────────────────────────────

async function LotStatsBar({ farmId }: { farmId: string }) {
  const lots = await getLotsByFarm(farmId)

  const totalLots    = lots.length
  const totalAnimals = lots.reduce((s, l) => s + l.stats.total, 0)
  const totalCows    = lots.reduce((s, l) => s + l.stats.cows, 0)
  const lactatingLot = lots.find((l) => l.type === 'LACTATING')

  const items = [
    { label: 'Lotes',    value: totalLots,                    color: 'text-foreground' },
    { label: 'Animais',  value: totalAnimals,                 color: 'text-green-400'  },
    { label: 'Vacas',    value: totalCows,                    color: 'text-purple-400' },
    { label: 'Lactação', value: lactatingLot?.stats.total ?? 0, color: 'text-cyan-400' },
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

// ─── Lista assíncrona (Suspense) ───────────────────────────

async function LotListAsync({
  farmId,
  searchParams,
}: {
  farmId:       string
  searchParams: Record<string, string>
}) {
  const filters = lotFiltersSchema.parse({
    search: searchParams.search,
    type:   searchParams.type,
  })

  const lots = await getLotsByFarm(farmId, filters)

  const isFiltered = Boolean(searchParams.search || searchParams.type)

  if (lots.length === 0) {
    return (
      <EmptyState
        icon={<Layers2 />}
        title={isFiltered ? 'Nenhum lote encontrado' : 'Nenhum lote cadastrado'}
        description={
          isFiltered
            ? 'Tente ajustar os filtros.'
            : 'Crie o primeiro lote para organizar o rebanho.'
        }
        action={
          !isFiltered
            ? { label: 'Criar Lote', href: '/lots/new' }
            : undefined
        }
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {lots.map((lot) => (
        <LotCard key={lot.id} lot={lot} />
      ))}
    </div>
  )
}

// ─── Skeleton da lista ─────────────────────────────────────

function LotListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[140px] rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────

export default async function LotsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const { prisma } = await import('@/lib/prisma')
  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm
  const params = await searchParams

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Lotes"
        actions={
          <Button asChild size="sm" className="h-9">
            <Link href="/lots/new">
              <Plus className="size-4 mr-1" />
              Novo
            </Link>
          </Button>
        }
      />

      {/* Stats rápidas */}
      <LotStatsBar farmId={farmId} />

      {/* Filtros */}
      <LotFilters />

      {/* Lista com streaming */}
      <Suspense fallback={<LotListSkeleton />}>
        <LotListAsync farmId={farmId} searchParams={params} />
      </Suspense>
    </div>
  )
}
