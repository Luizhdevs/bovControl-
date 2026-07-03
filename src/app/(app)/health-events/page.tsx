import { auth }                   from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect }               from 'next/navigation'
import { prisma }                 from '@/lib/prisma'
import { canAccess }              from '@/lib/permissions'
import { getHealthEventsByFarm }  from '@/modules/health-events/queries'
import { HealthEventCard }        from '@/modules/health-events/components/health-event-card'
import { PageHeader }             from '@/components/shared/page-header'
import { HEALTH_EVENT_LABELS }    from '@/modules/health-events/types'
import Link                       from 'next/link'
import { Plus, Activity }         from 'lucide-react'
import type { HealthEventType }   from '@prisma/client'

export const metadata = { title: 'Saúde | BovControl' }

// ─── Paginação Server Component ───────────────────────────

function HealthPagination({
  page,
  pageCount,
  searchParams,
}: {
  page:         number
  pageCount:    number
  searchParams: Record<string, string>
}) {
  if (pageCount <= 1) return null

  function pageUrl(p: number) {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(p))
    return `/health-events?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {page > 1 && (
        <Link href={pageUrl(page - 1)} className="text-sm text-primary hover:underline">
          ← Anterior
        </Link>
      )}
      <span className="text-xs text-muted-foreground">
        {page} / {pageCount}
      </span>
      {page < pageCount && (
        <Link href={pageUrl(page + 1)} className="text-sm text-primary hover:underline">
          Próxima →
        </Link>
      )}
    </div>
  )
}

// ─── Página ────────────────────────────────────────────────

interface Props {
  searchParams: Promise<Record<string, string>>
}

const TYPE_FILTER_OPTIONS: { value: HealthEventType | 'ALL'; label: string }[] = [
  { value: 'ALL',         label: 'Todos'       },
  { value: 'VACCINATION', label: 'Vacinação'   },
  { value: 'DISEASE',     label: 'Doença'      },
  { value: 'DEWORMING',   label: 'Vermifugação'},
  { value: 'EXAM',        label: 'Exame'       },
  { value: 'MEDICATION',  label: 'Medicação'   },
  { value: 'MASTITIS',    label: 'Mamite'      },
  { value: 'OTHER',       label: 'Outro'       },
]

export default async function HealthEventsPage({ searchParams }: Props) {
  const params  = await searchParams
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const typeFilter     = params.type     as HealthEventType | undefined
  const resolvedFilter = params.resolved as 'true' | 'false' | undefined
  const page           = Math.max(1, Number(params.page ?? 1))

  const [{ items, total, pageCount }, canManage] = await Promise.all([
    getHealthEventsByFarm(farmId, {
      type:     typeFilter,
      resolved: resolvedFilter,
      page,
    }),
    canAccess(session.user.id, farmId, 'WORKER'),
  ])

  // searchParams para Links de paginação (sem mutar page)
  const currentSp: Record<string, string> = {}
  if (typeFilter)     currentSp.type     = typeFilter
  if (resolvedFilter) currentSp.resolved = resolvedFilter

  function filterUrl(key: string, value: string) {
    const sp = new URLSearchParams(currentSp)
    if (value === 'ALL' || value === '') sp.delete(key)
    else sp.set(key, value)
    sp.delete('page')
    return `/health-events?${sp.toString()}`
  }

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Saúde Animal"
        description={`${total} evento${total !== 1 ? 's' : ''}`}
        actions={canManage ? (
          <Link
            href="/health-events/new"
            className="flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="size-4" />
            Registrar
          </Link>
        ) : undefined}
      />

      {/* Filtro por tipo */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {TYPE_FILTER_OPTIONS.map((opt) => {
          const isActive = opt.value === 'ALL'
            ? !typeFilter
            : typeFilter === opt.value
          return (
            <Link
              key={opt.value}
              href={filterUrl('type', opt.value)}
              className={`
                shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
                ${isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'}
              `}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* Filtro por status */}
      <div className="flex gap-2">
        {[
          { value: undefined,  label: 'Todos'      },
          { value: 'false',    label: 'Ativos'     },
          { value: 'true',     label: 'Resolvidos' },
        ].map((opt) => {
          const isActive = resolvedFilter === opt.value
          return (
            <Link
              key={opt.label}
              href={filterUrl('resolved', opt.value ?? '')}
              className={`
                rounded-full border px-3 py-1.5 text-xs font-medium transition-colors
                ${isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'}
              `}
            >
              {opt.label}
            </Link>
          )
        })}
      </div>

      {/* Lista */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <Activity className="size-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium">Nenhum evento encontrado</p>
            <p className="text-xs text-muted-foreground mt-1">
              {canManage
                ? 'Registre vacinações, exames, doenças e mais.'
                : 'Nenhum evento de saúde para os filtros aplicados.'}
            </p>
          </div>
          {canManage && (
            <Link
              href="/health-events/new"
              className="text-sm text-primary hover:underline"
            >
              Registrar primeiro evento →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((event) => (
            <HealthEventCard
              key={event.id}
              event={event}
              farmId={farmId}
              canManage={canManage}
              showAnimal
            />
          ))}
        </div>
      )}

      <HealthPagination
        page={page}
        pageCount={pageCount}
        searchParams={currentSp}
      />
    </div>
  )
}
