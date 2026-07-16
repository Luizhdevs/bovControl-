import { Suspense } from 'react'
import Link         from 'next/link'
import { auth }     from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect } from 'next/navigation'
import { Button }   from '@/components/ui/button'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

import { getAnimalsByFarm, getAnimalStats, getLotsForSelect, getPasturesForSelect } from '@/modules/animals/queries'
import { AnimalList }    from '@/modules/animals/components/animal-list'
import { AnimalFilters } from '@/modules/animals/components/animal-filters'
import { PageHeader }    from '@/components/shared/page-header'
import { animalFiltersSchema } from '@/modules/animals/schema'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Animais | BovControl' }

const PAGE_SIZE = 50

// ─── Props ─────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

// ─── Stats bar ─────────────────────────────────────────────

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

// ─── Paginação ─────────────────────────────────────────────

function AnimalPagination({
  page,
  pageCount,
  total,
  searchParams,
}: {
  page:        number
  pageCount:   number
  total:       number
  searchParams: Record<string, string>
}) {
  function buildUrl(p: number) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (k !== 'page' && v) params.set(k, v)
    }
    params.set('page', String(p))
    return `/animals?${params.toString()}`
  }

  const from = (page - 1) * PAGE_SIZE + 1
  const to   = Math.min(page * PAGE_SIZE, total)

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      <p className="text-xs text-muted-foreground">
        {from}–{to} de {total} animais
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildUrl(page - 1)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium',
              'border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors',
            )}
          >
            <ChevronLeft className="size-3" />
            Anterior
          </Link>
        ) : null}
        <span className="px-2 text-xs text-muted-foreground">
          {page}/{pageCount}
        </span>
        {page < pageCount ? (
          <Link
            href={buildUrl(page + 1)}
            className={cn(
              'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium',
              'border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors',
            )}
          >
            Próxima
            <ChevronRight className="size-3" />
          </Link>
        ) : null}
      </div>
    </div>
  )
}

// ─── Lista assíncrona com paginação ────────────────────────

async function AnimalListAsync({
  farmId,
  searchParams,
  lots,
}: {
  farmId:       string
  searchParams: Record<string, string>
  lots:         Awaited<ReturnType<typeof getLotsForSelect>>
}) {
  const filters = animalFiltersSchema.parse({
    search:    searchParams['search'],
    sex:       searchParams['sex'],
    category:  searchParams['category'],
    status:    searchParams['status'] ?? 'ACTIVE',
    purpose:   searchParams['purpose'],
    lotId:     searchParams['lotId'],
    pastureId: searchParams['pastureId'],
    agePreset: searchParams['agePreset'],
  })

  const page = Math.max(1, parseInt(searchParams['page'] ?? '1', 10) || 1)
  const { items, total, pageCount, page: currentPage } = await getAnimalsByFarm(farmId, filters, page, PAGE_SIZE)

  const effectiveStatus = searchParams['status'] ?? 'ACTIVE'
  const isFiltered = Boolean(
    searchParams['search']    ||
    searchParams['sex']       ||
    searchParams['category']  ||
    searchParams['agePreset'] ||
    searchParams['lotId']     ||
    searchParams['pastureId'] ||
    (effectiveStatus && effectiveStatus !== 'ACTIVE'),
  )

  return (
    <>
      <AnimalList animals={items} isFiltered={isFiltered} lots={lots} farmId={farmId} />
      {pageCount > 1 && (
        <AnimalPagination
          page={currentPage}
          pageCount={pageCount}
          total={total}
          searchParams={searchParams}
        />
      )}
    </>
  )
}

// ─── Skeleton ──────────────────────────────────────────────

function AnimalListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-[120px] rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────

export default async function AnimalsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm
  const params = await searchParams

  const [lots, pastures] = await Promise.all([
    getLotsForSelect(farmId),
    getPasturesForSelect(farmId),
  ])

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

      <AnimalStatsBar farmId={farmId} />
      <AnimalFilters lots={lots} pastures={pastures} />

      <Suspense fallback={<AnimalListSkeleton />}>
        <AnimalListAsync farmId={farmId} searchParams={params} lots={lots} />
      </Suspense>
    </div>
  )
}
