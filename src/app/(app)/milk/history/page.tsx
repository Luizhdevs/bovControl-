import { redirect }   from 'next/navigation'
import { Suspense }   from 'react'
import { auth }       from '@/lib/auth'
import { prisma }     from '@/lib/prisma'

import { getMilkHistoryByFarm, getMilkingSessionsByFarm } from '@/modules/milk/queries'
import { PageHeader }    from '@/components/shared/page-header'
import { SectionCard }   from '@/components/shared/section-card'
import { EmptyState }    from '@/components/shared/empty-state'
import { formatDate, formatLiters } from '@/lib/utils'
import { MILK_SHIFT_LABELS }  from '@/modules/shared/domain/animal-labels'
import { SHIFT_EMOJIS }       from '@/modules/milk/constants'
import { MilkIcon, TrendingUp } from 'lucide-react'
import MilkHistoryLoading from './loading'

// ─── Metadata ──────────────────────────────────────────────────

export const metadata = { title: 'Histórico de Leite | BovControl' }

// ─── Gráfico de barras CSS ─────────────────────────────────────

function ProductionChart({
  data,
}: {
  data: { date: string; liters: number }[]
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        Sem dados no período
      </div>
    )
  }

  const max     = Math.max(...data.map((d) => d.liters), 1)
  const total   = data.reduce((s, d) => s + d.liters, 0)
  const average = total / data.length

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-cyan-400 tabular-nums">
            {formatLiters(total)}
          </div>
          <div className="text-[10px] text-muted-foreground">Total</div>
        </div>
        <div>
          <div className="text-lg font-bold text-foreground tabular-nums">
            {formatLiters(average)}
          </div>
          <div className="text-[10px] text-muted-foreground">Média/dia</div>
        </div>
        <div>
          <div className="text-lg font-bold text-foreground tabular-nums">
            {formatLiters(max)}
          </div>
          <div className="text-[10px] text-muted-foreground">Pico</div>
        </div>
      </div>

      {/* Barras */}
      <div className="flex items-end gap-0.5 h-28 overflow-x-auto pb-1">
        {data.map((point) => {
          const height = max > 0 ? (point.liters / max) * 100 : 0
          const label  = formatDate(point.date).slice(0, 5)   // dd/MM

          return (
            <div
              key={point.date}
              className="flex flex-col items-center gap-0.5 flex-1 min-w-[8px] group"
              title={`${formatDate(point.date)}: ${formatLiters(point.liters)}`}
            >
              <div
                className="w-full rounded-t bg-cyan-500/80 group-hover:bg-cyan-400 transition-colors min-h-[2px]"
                style={{ height: `${Math.max(height, 2)}%` }}
              />
              {data.length <= 14 && (
                <span className="text-[8px] text-muted-foreground/60 leading-none">
                  {label}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Inner async component (Suspense boundary) ─────────────────

async function HistoryContent({
  farmId,
  days,
}: {
  farmId: string
  days:   number
}) {
  const [history, sessions] = await Promise.all([
    getMilkHistoryByFarm(farmId, days),
    getMilkingSessionsByFarm(farmId, days),
  ])

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<MilkIcon />}
        title="Sem registros no período"
        description="Registre a produção diária para visualizar o histórico."
        action={{ label: 'Registrar agora', href: '/milk/new' }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Gráfico */}
      <SectionCard
        title={`Produção — últimos ${days} dias`}
        action={<TrendingUp className="size-4 text-muted-foreground" />}
      >
        <ProductionChart data={history} />
      </SectionCard>

      {/* Tabela de sessões */}
      <SectionCard title="Detalhamento por ordenha" noPadding>
        <div className="divide-y divide-border/50">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <span className="text-base leading-none shrink-0">
                {SHIFT_EMOJIS[s.shift]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {MILK_SHIFT_LABELS[s.shift]}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(s.date)} · {s.milkingCows} vacas · {s.avgPerCow.toFixed(1)} L/vaca
                </div>
              </div>
              <span className="text-sm font-bold tabular-nums text-cyan-400 shrink-0">
                {formatLiters(s.totalLiters)}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────

export default async function MilkHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const params = await searchParams
  const days   = Math.min(Math.max(parseInt(params.days ?? '30', 10), 7), 90)

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        backHref="/milk"
        title="Histórico de Produção"
        description="Evolução da ordenha"
      />

      <Suspense fallback={<MilkHistoryLoading />}>
        <HistoryContent farmId={farmUser.farmId} days={days} />
      </Suspense>
    </div>
  )
}
