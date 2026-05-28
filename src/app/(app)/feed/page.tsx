import { auth }              from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect }          from 'next/navigation'
import { prisma }            from '@/lib/prisma'
import Link                  from 'next/link'
import { Plus, Wheat, Download } from 'lucide-react'
import { PageHeader }        from '@/components/shared/page-header'
import { getFeedSessionsByFarm, getDashboardFeedData } from '@/modules/feed/queries'
import { FeedSessionCard }   from '@/modules/feed/components/feed-session-card'
import { formatCurrency }    from '@/lib/utils'

export const metadata = { title: 'Alimentação | BovControl' }

export default async function FeedPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm
  const canDelete = role === 'OWNER'

  const [feedData, sessions] = await Promise.all([
    getDashboardFeedData(farmId),
    getFeedSessionsByFarm(farmId, 30),
  ])

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Alimentação"
        description="Controle de ração por lote"
        actions={
          <Link
            href="/feed/new"
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="size-4" />
            Registrar
          </Link>
        }
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Hoje</p>
          <p className="text-2xl font-bold tabular-nums">{feedData.todayKg.toFixed(0)} kg</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(feedData.todayCost)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Esta semana</p>
          <p className="text-2xl font-bold tabular-nums">{feedData.weeklyKg.toFixed(0)} kg</p>
          <p className="text-xs text-muted-foreground">{formatCurrency(feedData.weeklyCost)}</p>
        </div>
        {feedData.costPerLiter != null && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Custo/litro</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(feedData.costPerLiter)}/L</p>
            <p className="text-xs text-muted-foreground">ração / leite</p>
          </div>
        )}
        {feedData.avgKgPerAnimal > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">Média kg/animal</p>
            <p className="text-2xl font-bold tabular-nums">{feedData.avgKgPerAnimal.toFixed(2)} kg</p>
            <p className="text-xs text-muted-foreground">semana</p>
          </div>
        )}
        {feedData.topLot && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 col-span-2">
            <p className="text-xs text-muted-foreground mb-0.5">Maior consumo esta semana</p>
            <p className="text-sm font-bold">{feedData.topLot.name}</p>
            <p className="text-xs text-muted-foreground">{feedData.topLot.kg.toFixed(0)} kg</p>
          </div>
        )}
      </div>

      {/* Exportar CSV */}
      <div className="flex justify-end">
        <a
          href="/api/feed/export?type=sessions"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Download className="size-3.5" />
          Exportar CSV (30 dias)
        </a>
      </div>

      {/* Histórico */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Histórico (30 dias)</h2>

        {sessions.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-3 text-center rounded-xl border border-dashed border-border">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center">
              <Wheat className="size-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum registro de alimentação</p>
              <p className="text-xs text-muted-foreground mt-0.5">Registre a primeira alimentação do seu lote</p>
            </div>
            <Link
              href="/feed/new"
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Plus className="size-4" />
              Registrar alimentação
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <FeedSessionCard
                key={s.id}
                session={s}
                farmId={farmId}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
