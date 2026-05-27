import { auth }                from '@/lib/auth'
import { redirect }            from 'next/navigation'
import { prisma }              from '@/lib/prisma'
import { getAnimalStats, getRecentAnimalsCount } from '@/modules/animals/queries'
import { getDashboardMilkData, getWeeklyProduction } from '@/modules/milk/queries'
import { getPendingAlertCount } from '@/modules/alerts/queries'
import { getPregnantAnimals }   from '@/modules/reproduction/queries'
import { PageHeader }           from '@/components/shared/page-header'
import { formatLiters }         from '@/lib/utils'
import {
  PawPrint,
  MilkIcon,
  Bell,
  Heart,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Plus,
  Sparkles,
  Activity,
  BarChart3,
} from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dashboard | BovControl' }

// ─── Helpers ───────────────────────────────────────────────────

function pct(a: number, b: number): string {
  if (b === 0) return a > 0 ? '+∞' : '—'
  const diff = ((a - b) / b) * 100
  if (Math.abs(diff) < 0.5) return '='
  return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%'
}

// ─── Gráfico de barras CSS ─────────────────────────────────────

function MiniBarChart({
  data,
}: {
  data: { date: string; liters: number; label: string }[]
}) {
  const max = Math.max(...data.map((d) => d.liters), 1)

  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => {
        const pctHeight = max > 0 ? (d.liters / max) * 100 : 0
        const isToday   = d.date === new Date().toISOString().split('T')[0]

        return (
          <div
            key={d.date}
            className="flex-1 flex flex-col items-center gap-1"
            title={`${d.label}: ${formatLiters(d.liters)}`}
          >
            <div className="w-full flex flex-col justify-end" style={{ height: '48px' }}>
              <div
                className={`w-full rounded-t-sm transition-all ${
                  isToday ? 'bg-primary' : 'bg-primary/30'
                }`}
                style={{ height: `${Math.max(pctHeight, d.liters > 0 ? 8 : 2)}%` }}
              />
            </div>
            <span className={`text-[9px] ${isToday ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Página ────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true, farm: { select: { name: true } } },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId } = farmUser

  // Todas as queries em paralelo — sem waterfall
  const [
    stats,
    milkData,
    pendingAlerts,
    pregnantAnimals,
    recentCount,
    weeklyProduction,
  ] = await Promise.all([
    getAnimalStats(farmId),
    getDashboardMilkData(farmId),
    getPendingAlertCount(farmId),
    getPregnantAnimals(farmId, 3),
    getRecentAnimalsCount(farmId, 7),
    getWeeklyProduction(farmId),
  ])

  const kpis = [
    { label: 'Animais Ativos', value: stats.total,                  icon: PawPrint, href: '/animals',             color: 'text-green-400'  },
    { label: 'Vacas',          value: stats.cows,                   icon: PawPrint, href: '/animals?category=COW', color: 'text-purple-400' },
    { label: 'Leite Hoje',     value: formatLiters(milkData.today), icon: MilkIcon, href: '/milk',                color: 'text-cyan-400'   },
    { label: 'Alertas',        value: pendingAlerts,                icon: Bell,     href: '/alerts',              color: 'text-amber-400'  },
  ]

  const milkVariation = pct(milkData.today, milkData.yesterday)
  const milkUp = milkData.today > milkData.yesterday
  const milkEq = milkData.today === milkData.yesterday

  const weeklyTotal = weeklyProduction.reduce((s, d) => s + d.liters, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        title={farmUser.farm.name}
        description="Visão geral da fazenda"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors"
          >
            <kpi.icon className={`size-5 ${kpi.color}`} />
            <div>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Produção de Leite ──────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Produção de Leite</h2>
          <Link href="/milk" className="text-xs text-primary hover:underline">Ver histórico</Link>
        </div>

        {/* Hoje vs ontem */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-2xl font-bold tabular-nums">{formatLiters(milkData.today)}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            milkEq ? 'text-muted-foreground' : milkUp ? 'text-green-400' : 'text-red-400'
          }`}>
            {milkEq
              ? <Minus className="size-4" />
              : milkUp
              ? <TrendingUp className="size-4" />
              : <TrendingDown className="size-4" />}
            {milkVariation}
          </div>
          <div className="text-right ml-auto">
            <p className="text-sm font-medium tabular-nums text-muted-foreground">
              {formatLiters(milkData.yesterday)}
            </p>
            <p className="text-xs text-muted-foreground">Ontem</p>
          </div>
        </div>

        {/* Por turno */}
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { label: '🌅 Manhã',  value: milkData.byShift.MORNING   },
              { label: '🌆 Tarde',  value: milkData.byShift.AFTERNOON },
            ] as const
          ).map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-lg font-bold tabular-nums mt-0.5">{formatLiters(s.value)}</p>
            </div>
          ))}
        </div>

        {/* Ação rápida */}
        <Link
          href="/milk/new"
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-primary/40 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
        >
          <Plus className="size-4" />
          Registrar Ordenha
        </Link>
      </div>

      {/* ── Análise Semanal ────────────────────────────────── */}
      {weeklyTotal > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              Últimos 7 dias
            </h2>
            <span className="text-xs text-muted-foreground">
              Total: {formatLiters(weeklyTotal)}
            </span>
          </div>

          <MiniBarChart data={weeklyProduction} />
        </div>
      )}

      {/* ── Reprodução ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Reprodução</h2>
          <Link href="/reproduction" className="text-xs text-primary hover:underline">Ver tudo</Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
            <Heart className="size-5 text-pink-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{pregnantAnimals.length}</p>
            <p className="text-xs text-muted-foreground">
              {pregnantAnimals.length === 1 ? 'vaca prenhe' : 'vacas prenhes'}
            </p>
          </div>
        </div>

        {pregnantAnimals.length > 0 ? (
          <div className="space-y-2">
            {pregnantAnimals.map((c) => (
              <div
                key={c.animalId}
                className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-xs font-mono font-bold">{c.tag}</span>
                  {c.name && (
                    <span className="text-xs text-muted-foreground"> · {c.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" />
                  {c.daysUntilCalving < 0
                    ? 'Atrasado'
                    : c.daysUntilCalving === 0
                    ? 'Hoje'
                    : `${c.daysUntilCalving}d`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma gestação confirmada.</p>
        )}

        <Link
          href="/reproduction/new"
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-pink-500/30 py-2.5 text-sm font-medium text-pink-400 hover:bg-pink-500/5 transition-colors"
        >
          <Plus className="size-4" />
          Registrar Reprodução
        </Link>
      </div>

      {/* ── Rebanho por Categoria ──────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Rebanho por Categoria</h2>
          {recentCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <Sparkles className="size-3" />
              +{recentCount} esta semana
            </span>
          )}
        </div>
        <div className="space-y-2">
          {[
            { label: 'Vacas',    value: stats.cows,    color: 'bg-purple-500' },
            { label: 'Novilhas', value: stats.heifers, color: 'bg-blue-500'   },
            { label: 'Bezerros', value: stats.calves,  color: 'bg-green-500'  },
            { label: 'Touros',   value: stats.bulls,   color: 'bg-red-500'    },
            { label: 'Bois',     value: stats.steers,  color: 'bg-amber-500'  },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-20">{item.label}</span>
              <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: stats.total > 0 ? `${(item.value / stats.total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-medium w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ações Rápidas ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/animals/new"
          className="rounded-xl border border-dashed border-primary/40 p-4 flex flex-col items-center gap-2 text-primary hover:bg-primary/5 transition-colors"
        >
          <PawPrint className="size-6" />
          <span className="text-sm font-medium">Novo Animal</span>
        </Link>
        <Link
          href="/health-events/new"
          className="rounded-xl border border-dashed border-green-500/30 p-4 flex flex-col items-center gap-2 text-green-400 hover:bg-green-500/5 transition-colors"
        >
          <Activity className="size-6" />
          <span className="text-sm font-medium">Evento Saúde</span>
        </Link>
        <Link
          href="/alerts"
          className="rounded-xl border border-dashed border-amber-500/30 p-4 flex flex-col items-center gap-2 text-amber-400 hover:bg-amber-500/5 transition-colors relative"
        >
          <Bell className="size-6" />
          <span className="text-sm font-medium">Alertas</span>
          {pendingAlerts > 0 && (
            <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {pendingAlerts > 99 ? '99+' : pendingAlerts}
            </span>
          )}
        </Link>
        <Link
          href="/milk"
          className="rounded-xl border border-dashed border-cyan-500/30 p-4 flex flex-col items-center gap-2 text-cyan-400 hover:bg-cyan-500/5 transition-colors"
        >
          <MilkIcon className="size-6" />
          <span className="text-sm font-medium">Produção</span>
        </Link>
      </div>
    </div>
  )
}
