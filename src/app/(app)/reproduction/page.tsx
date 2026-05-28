import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import {
  getAnimalsForReproduction,
  getReproductionStats,
  getPregnantAnimals,
} from '@/modules/reproduction/queries'
import { ReproductionQuickRegister } from '@/modules/reproduction/components/reproduction-quick-register'
import { ExpectedCalvingCard } from '@/modules/reproduction/components/expected-calving-card'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = { title: 'Reprodução | BovControl' }

// ─── Conteúdo assíncrono ────────────────────────────────────

async function ReproductionDashboardContent({ farmId }: { farmId: string }) {
  const [animals, stats, pregnantAnimals] = await Promise.all([
    getAnimalsForReproduction(farmId),
    getReproductionStats(farmId),
    getPregnantAnimals(farmId),
  ])

  // Próximos partos (30 dias)
  const upcomingCalvings = pregnantAnimals.filter((a) => a.daysUntilCalving <= 30)

  return (
    <div className="space-y-4">
      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400 tabular-nums">
            {stats.totalPregnant}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
            Animais prenhes
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {stats.recentInseminations}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
            Eventos (30d)
          </div>
        </div>
      </div>

      {/* Ação rápida */}
      <ReproductionQuickRegister farmId={farmId} animals={animals} />

      {/* Partos iminentes */}
      {upcomingCalvings.length > 0 && (
        <SectionCard title="Partos próximos" subtitle={`${upcomingCalvings.length} em 30 dias`}>
          <div className="space-y-3">
            {upcomingCalvings.slice(0, 5).map((c) => (
              <Link key={c.animalId} href={`/reproduction/${c.animalId}`} className="block">
                <ExpectedCalvingCard
                  expectedCalvingDate={c.expectedCalvingDate}
                  confirmedAt={c.confirmedAt}
                />
                <div className="text-xs text-muted-foreground mt-1 px-1">
                  {c.name ? `${c.tag} · ${c.name}` : c.tag}
                </div>
              </Link>
            ))}
            {upcomingCalvings.length > 5 && (
              <Link
                href="/reproduction/history"
                className="text-xs text-primary hover:underline block text-center py-1"
              >
                Ver todos ({upcomingCalvings.length})
              </Link>
            )}
          </div>
        </SectionCard>
      )}

      {/* Todas as prenhes */}
      {pregnantAnimals.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">🐄</span>}
          title="Nenhuma prenhez confirmada"
          description="Registre inseminações e diagnósticos de gestação para acompanhar o rebanho."
        />
      ) : (
        <SectionCard
          title="Animais prenhes"
          subtitle={`${pregnantAnimals.length} confirmadas`}
          noPadding
        >
          <div className="px-4 divide-y divide-border/40">
            {pregnantAnimals.map((c) => (
              <Link
                key={c.animalId}
                href={`/reproduction/${c.animalId}`}
                className="flex items-center justify-between py-3 hover:bg-muted/30 -mx-4 px-4 transition-colors min-h-[52px]"
              >
                <div>
                  <span className="text-sm font-medium">{c.tag}</span>
                  {c.name && (
                    <span className="text-muted-foreground text-xs ml-2">{c.name}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {c.daysUntilCalving > 0
                    ? `${c.daysUntilCalving}d para parto`
                    : c.daysUntilCalving === 0
                      ? 'Parto hoje'
                      : `${Math.abs(c.daysUntilCalving)}d atrasado`}
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────

export default async function ReproductionPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reprodução"
        description="Gestão reprodutiva do rebanho"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reproduction/history">
              <History className="size-4 mr-1.5" />
              Histórico
            </Link>
          </Button>
        }
      />

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card h-20 animate-pulse" />
              <div className="rounded-xl border border-border bg-card h-20 animate-pulse" />
            </div>
            <div className="rounded-xl border border-border bg-card h-12 animate-pulse" />
          </div>
        }
      >
        <ReproductionDashboardContent farmId={activeFarm.farmId} />
      </Suspense>
    </div>
  )
}
