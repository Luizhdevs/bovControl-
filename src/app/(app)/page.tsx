import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getAnimalStats } from '@/modules/animals/queries'
import { getDailyMilkSummary } from '@/modules/milk/queries'
import { PageHeader } from '@/components/shared/page-header'
import { formatLiters } from '@/lib/utils'
import { PawPrint, MilkIcon, Bell, Layers2 } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Dashboard | BovControl' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where: { userId: session.user.id },
    select: { farmId: true, farm: { select: { name: true } } },
  })
  if (!farmUser) redirect('/onboarding')

  const [stats, milkToday] = await Promise.all([
    getAnimalStats(farmUser.farmId),
    getDailyMilkSummary(farmUser.farmId),
  ])

  const kpis = [
    { label: 'Animais Ativos', value: stats.total, icon: PawPrint, href: '/animals', color: 'text-green-400' },
    { label: 'Vacas',          value: stats.cows,  icon: PawPrint, href: '/animals?category=COW', color: 'text-purple-400' },
    { label: 'Leite Hoje',     value: formatLiters(milkToday.totalLiters), icon: MilkIcon, href: '/milk', color: 'text-cyan-400' },
    { label: 'Alertas',        value: 0,            icon: Bell,    href: '/alerts', color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-6">
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

      {/* Categorias */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold mb-3">Rebanho por Categoria</h2>
        <div className="space-y-2">
          {[
            { label: 'Vacas',    value: stats.cows,    color: 'bg-purple-500' },
            { label: 'Novilhas', value: stats.heifers, color: 'bg-blue-500' },
            { label: 'Bezerros', value: stats.calves,  color: 'bg-green-500' },
            { label: 'Touros',   value: stats.bulls,   color: 'bg-red-500' },
            { label: 'Bois',     value: stats.steers,  color: 'bg-amber-500' },
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

      {/* Acesso rápido */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/animals/new" className="rounded-xl border border-dashed border-primary/40 p-4 flex flex-col items-center gap-2 text-primary hover:bg-primary/5 transition-colors">
          <PawPrint className="size-6" />
          <span className="text-sm font-medium">Novo Animal</span>
        </Link>
        <Link href="/lots" className="rounded-xl border border-dashed border-border p-4 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
          <Layers2 className="size-6" />
          <span className="text-sm font-medium">Ver Lotes</span>
        </Link>
      </div>
    </div>
  )
}
