import { auth }           from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { getActiveFarm }   from '@/lib/active-farm'
import Link                from 'next/link'
import { Stethoscope, AlertTriangle, ChevronRight, Plus, Calendar } from 'lucide-react'
import {
  getVeterinaryDashboardStats,
  getVeterinaryAttentionList,
  getPendingVeterinaryReport,
} from '@/modules/veterinary/queries'
import { VeterinaryGroupBadge }  from '@/modules/veterinary/components/veterinary-group-badge'
import { VeterinaryStatusBadge } from '@/modules/veterinary/components/veterinary-status-badge'
import { PageHeader }    from '@/components/shared/page-header'
import { SectionCard }   from '@/components/shared/section-card'
import { formatDate }    from '@/lib/utils'
import { REPORT_SOURCE_LABELS, VETERINARY_GROUP_ORDER } from '@/modules/veterinary/constants'

export const metadata = { title: 'Veterinário | BovControl' }

const ALERT_CARD_CONFIGS = [
  { key: 'emptyLate'     as const, label: 'Vazias atrasadas', color: 'text-red-500'    },
  { key: 'toDry'         as const, label: 'A secar',          color: 'text-amber-500'  },
  { key: 'calvingSoon'   as const, label: 'Parto próximo',    color: 'text-violet-500' },
  { key: 'pregnancyCheck'as const, label: 'Prenhez pendente', color: 'text-sky-500'    },
  { key: 'highCcs'       as const, label: 'CCS alto',         color: 'text-orange-500' },
  { key: 'mastitis'      as const, label: 'Mamite',           color: 'text-rose-500'   },
  { key: 'discard'       as const, label: 'Rev. descarte',    color: 'text-zinc-500'   },
] as const

export default async function VeterinaryDashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm

  const isManager = ['OWNER', 'MANAGER'].includes(role)

  const [stats, attentionList, pendingReport] = await Promise.all([
    getVeterinaryDashboardStats(farmId),
    getVeterinaryAttentionList(farmId),
    getPendingVeterinaryReport(farmId),
  ])

  const totalAlerts = ALERT_CARD_CONFIGS.reduce(
    (sum, cfg) => sum + stats.pendingAlertCounts[cfg.key],
    0,
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Veterinário"
        description="Acompanhamento e alertas do rebanho"
        actions={
          isManager ? (
            <Link
              href="/veterinary/import"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              Importar
            </Link>
          ) : undefined
        }
      />

      {/* Relatório pendente */}
      {pendingReport && isManager && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Relatório pendente de confirmação
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {REPORT_SOURCE_LABELS[pendingReport.sourceSystem as keyof typeof REPORT_SOURCE_LABELS] ?? pendingReport.sourceSystem}
                {' · '}
                {formatDate(pendingReport.reportDate)}
              </p>
            </div>
          </div>
          <Link
            href={`/veterinary/import/${pendingReport.id}/review`}
            className="text-xs text-primary hover:underline whitespace-nowrap flex items-center gap-1 shrink-0 mt-0.5"
          >
            Continuar
            <ChevronRight className="size-3" />
          </Link>
        </div>
      )}

      {/* Estado vazio */}
      {!stats.latestReport ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
          <Stethoscope className="size-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum relatório veterinário confirmado
          </p>
          {isManager && (
            <Link
              href="/veterinary/import"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="size-3.5" />
              Importar primeiro relatório
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Resumo do último relatório */}
          <SectionCard
            title="Último Relatório"
            action={
              <Link href="/veterinary/reports" className="text-xs text-primary hover:underline">
                Ver todos
              </Link>
            }
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">
                {REPORT_SOURCE_LABELS[stats.latestReport.sourceSystem as keyof typeof REPORT_SOURCE_LABELS] ?? stats.latestReport.sourceSystem}
              </span>
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <Calendar className="size-3.5" />
                {formatDate(stats.latestReport.reportDate)}
              </span>
              {stats.latestReport.technicianName && (
                <span className="text-xs text-muted-foreground">
                  Téc: {stats.latestReport.technicianName}
                </span>
              )}
              <VeterinaryStatusBadge status={stats.latestReport.importStatus} />
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>{stats.totalAnimalsInReport} animais no relatório</span>
              {stats.unmatchedCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">
                  {stats.unmatchedCount} sem vínculo
                </span>
              )}
            </div>
          </SectionCard>

          {/* Cards de alertas pendentes */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Alertas veterinários pendentes
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ALERT_CARD_CONFIGS.map((cfg) => (
                <Link
                  key={cfg.key}
                  href="/alerts"
                  className="rounded-xl border border-border bg-card p-3 text-center hover:bg-muted/40 transition-colors"
                >
                  <div className={`text-2xl font-bold tabular-nums ${cfg.color}`}>
                    {stats.pendingAlertCounts[cfg.key]}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {cfg.label}
                  </div>
                </Link>
              ))}
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <div className="text-2xl font-bold tabular-nums text-foreground">
                  {totalAlerts}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                  Total alertas
                </div>
              </div>
            </div>
          </div>

          {/* Distribuição por grupo no relatório */}
          {Object.values(stats.groupCounts).some((c) => c > 0) && (
            <SectionCard title="Distribuição por Grupo">
              <div className="flex flex-wrap gap-2">
                {VETERINARY_GROUP_ORDER.map((group) => {
                  const count = stats.groupCounts[group]
                  if (!count) return null
                  return (
                    <div key={group} className="flex items-center gap-1.5">
                      <VeterinaryGroupBadge group={group} size="sm" />
                      <span className="text-xs font-bold tabular-nums">{count}</span>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* Lista de atenção */}
          {attentionList.length > 0 && (
            <SectionCard
              title="Atenção"
              subtitle={`${attentionList.length} animal${attentionList.length !== 1 ? 'is' : ''} requerem ação`}
            >
              <div className="divide-y divide-border">
                {attentionList.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      {snap.animal ? (
                        <Link
                          href={`/animals/${snap.animal.id}`}
                          className="font-mono text-sm font-bold text-primary hover:underline"
                        >
                          {snap.animal.tag}
                        </Link>
                      ) : (
                        <span className="font-mono text-sm text-muted-foreground">
                          {snap.animalName ?? snap.externalCode ?? '—'}
                        </span>
                      )}
                      {snap.animal?.name && (
                        <span className="ml-2 text-xs text-muted-foreground truncate">
                          {snap.animal.name}
                        </span>
                      )}
                    </div>
                    <VeterinaryGroupBadge group={snap.reportGroup} size="sm" />
                    {snap.expectedCalvingDate && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                        Prev: {formatDate(snap.expectedCalvingDate)}
                      </span>
                    )}
                    {snap.animal && (
                      <Link
                        href={`/animals/${snap.animal.id}`}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <ChevronRight className="size-4" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
