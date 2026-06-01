import { notFound, redirect } from 'next/navigation'
import { auth }              from '@/lib/auth'
import { getActiveFarm }     from '@/lib/active-farm'
import { prisma }            from '@/lib/prisma'

import {
  getAnimalMilkStats,
  getAnimalParticipations,
  getMilkRecordsByAnimal,
} from '@/modules/milk/queries'
import { MilkRecordCard }   from '@/modules/milk/components/milk-record-card'
import { PageHeader }       from '@/components/shared/page-header'
import { SectionCard }      from '@/components/shared/section-card'
import { EmptyState }       from '@/components/shared/empty-state'
import { formatLiters, formatDate } from '@/lib/utils'
import { getCategoryLabel }  from '@/modules/shared/domain/animal-labels'
import { MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'
import { MilkIcon, Droplets, CalendarDays, TrendingUp, Hash } from 'lucide-react'

// ─── Metadata dinâmica ─────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ animalId: string }> }) {
  const { animalId } = await params
  const session = await auth()
  if (!session) return {}

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return {}

  const animal = await prisma.animal.findFirst({
    where:  { id: animalId, farmId: activeFarm.farmId },
    select: { tag: true, name: true },
  })

  if (!animal) return { title: 'Leite | BovControl' }
  const display = animal.name ? `${animal.tag} · ${animal.name}` : animal.tag
  return { title: `Leite — ${display} | BovControl` }
}

// ─── Page ──────────────────────────────────────────────────────

export default async function MilkAnimalPage({ params }: { params: Promise<{ animalId: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { animalId } = await params

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm
  const canDelete = ['OWNER', 'MANAGER'].includes(role)

  const [animal, stats, participations, legacyRecords] = await Promise.all([
    prisma.animal.findFirst({
      where:  { id: animalId, farmId },
      select: { id: true, tag: true, name: true, category: true, sex: true, status: true, lot: { select: { id: true, name: true } } },
    }),
    getAnimalMilkStats(animalId, farmId),
    getAnimalParticipations(animalId, farmId, 60),
    getMilkRecordsByAnimal(animalId, farmId, 20),
  ])

  if (!animal) notFound()

  const categoryLabel = getCategoryLabel(animal.category, animal.sex)

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        backHref="/milk"
        title={animal.name ?? animal.tag}
        description={`${animal.tag} · ${categoryLabel}${animal.lot ? ` · ${animal.lot.name}` : ''}`}
      />

      {/* ── Métricas de produção ────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Droplets className="size-3.5 text-cyan-400" />}
          label="Vitalícia"
          value={formatLiters(stats.totalLifetime)}
          highlight
        />
        <StatCard
          icon={<CalendarDays className="size-3.5 text-muted-foreground" />}
          label="Últimos 30 dias"
          value={formatLiters(stats.totalLast30Days)}
        />
        <StatCard
          icon={<TrendingUp className="size-3.5 text-muted-foreground" />}
          label="Ano atual"
          value={formatLiters(stats.totalCurrentYear)}
        />
        <StatCard
          icon={<Hash className="size-3.5 text-muted-foreground" />}
          label="Participações"
          value={String(stats.participationCount)}
        />
      </div>

      {/* ── Histórico de participações em ordenhas ──────── */}
      <SectionCard
        title="Participações em ordenhas"
        subtitle={`${stats.participationCount} ordenhas · ${formatLiters(stats.totalLifetime)} estimados`}
        noPadding
      >
        {participations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<MilkIcon />}
              title="Sem participações registradas"
              description="Esta vaca ainda não participou de nenhuma ordenha por sessão."
            />
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {participations.map((p) => (
              <div key={`${p.sessionId}`} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">
                    {formatDate(p.date)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {MILK_SHIFT_LABELS[p.shift] ?? p.shift}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.isEstimated && (
                    <span className="text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-1.5 py-0.5">
                      Estimado
                    </span>
                  )}
                  <span className="text-sm font-bold tabular-nums text-cyan-400">
                    {p.liters != null ? formatLiters(p.liters) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Registros individuais (legado) ──────────────── */}
      {legacyRecords.length > 0 && (
        <SectionCard title="Registros individuais (histórico)" noPadding>
          <div className="px-4 divide-y divide-border/40">
            {legacyRecords.map((record) => (
              <MilkRecordCard
                key={record.id}
                record={record}
                farmId={farmId}
                showAnimal={false}
                canDelete={canDelete}
              />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────

function StatCard({ icon, label, value, highlight = false }: {
  icon:       React.ReactNode
  label:      string
  value:      string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center space-y-1">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-xl font-bold tabular-nums ${highlight ? 'text-cyan-400' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  )
}
