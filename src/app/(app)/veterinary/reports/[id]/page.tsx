import { notFound, redirect } from 'next/navigation'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import Link              from 'next/link'
import { ChevronRight }  from 'lucide-react'
import {
  getVeterinaryReportById,
  getSnapshotsByReport,
} from '@/modules/veterinary/queries'
import { VeterinaryGroupBadge }  from '@/modules/veterinary/components/veterinary-group-badge'
import { VeterinaryStatusBadge } from '@/modules/veterinary/components/veterinary-status-badge'
import { PageHeader }            from '@/components/shared/page-header'
import { SectionCard, InfoRow, InfoRows } from '@/components/shared/section-card'
import { formatDate }            from '@/lib/utils'
import { REPORT_SOURCE_LABELS }  from '@/modules/veterinary/constants'

export const metadata = { title: 'Relatório Veterinário | BovControl' }

export default async function VeterinaryReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params
  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm

  const isManager = ['OWNER', 'MANAGER'].includes(role)

  const [report, snapshots] = await Promise.all([
    getVeterinaryReportById(id, farmId),
    getSnapshotsByReport(id, farmId),
  ])

  if (!report) notFound()

  const sourceLabel =
    REPORT_SOURCE_LABELS[report.sourceSystem as keyof typeof REPORT_SOURCE_LABELS] ??
    report.sourceSystem

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/veterinary/reports"
        title={`Relatório ${sourceLabel}`}
        description={formatDate(report.reportDate)}
        actions={
          isManager && ['DRAFT', 'PARTIALLY_IMPORTED'].includes(report.importStatus) ? (
            <Link
              href={`/veterinary/import/${report.id}/review`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Continuar revisão
              <ChevronRight className="size-3.5" />
            </Link>
          ) : undefined
        }
      />

      {/* Metadados */}
      <SectionCard title="Informações">
        <InfoRows>
          <InfoRow
            label="Status"
            value={<VeterinaryStatusBadge status={report.importStatus} />}
          />
          <InfoRow label="Data"   value={formatDate(report.reportDate)} />
          <InfoRow label="Fonte"  value={sourceLabel} />
          {report.technicianName && (
            <InfoRow label="Técnico" value={report.technicianName} />
          )}
          {report.externalFarmName && (
            <InfoRow label="Fazenda" value={report.externalFarmName} />
          )}
          {report.externalOwnerName && (
            <InfoRow label="Proprietário" value={report.externalOwnerName} />
          )}
          <InfoRow label="Total" value={`${report.totalRows} animais`} />
          {report.matchedRows != null && (
            <InfoRow label="Vinculados" value={String(report.matchedRows)} />
          )}
          {report.unmatchedRows != null && (
            <InfoRow
              label="Sem vínculo"
              value={
                <span className={report.unmatchedRows > 0 ? 'text-amber-600 dark:text-amber-400' : ''}>
                  {report.unmatchedRows}
                </span>
              }
            />
          )}
        </InfoRows>
      </SectionCard>

      {/* Grupos */}
      {report.groupSummary && report.groupSummary.length > 0 && (
        <SectionCard title="Por Grupo">
          <div className="flex flex-wrap gap-3">
            {report.groupSummary.map((g) => (
              <div key={g.group} className="flex items-center gap-1.5">
                <VeterinaryGroupBadge group={g.group} size="sm" />
                <span className="text-xs font-bold tabular-nums">{g.count}</span>
                {g.unmatched > 0 && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    ({g.unmatched} sem vínculo)
                  </span>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Tabela de snapshots */}
      <SectionCard
        title="Animais"
        subtitle={`${snapshots.length} registros`}
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Animal</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Grupo</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">NP</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Parto prev.</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">CCS ×1000</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Mamite</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snap) => (
                <tr
                  key={snap.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <td className="p-3">
                    {snap.animal ? (
                      <div>
                        <Link
                          href={`/animals/${snap.animal.id}`}
                          className="font-mono font-bold text-primary hover:underline"
                        >
                          {snap.animal.tag}
                        </Link>
                        {snap.animalName && (
                          <p className="text-muted-foreground mt-0.5 truncate max-w-[120px]">
                            {snap.animalName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="text-muted-foreground font-mono">
                          {snap.externalCode ?? '—'}
                        </span>
                        {snap.animalName && (
                          <p className="text-muted-foreground mt-0.5 truncate max-w-[120px]">
                            {snap.animalName}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <VeterinaryGroupBadge group={snap.reportGroup} size="sm" />
                  </td>
                  <td className="p-3 hidden sm:table-cell tabular-nums">
                    {snap.parityNumber ?? '—'}
                  </td>
                  <td className="p-3 hidden sm:table-cell whitespace-nowrap">
                    {snap.expectedCalvingDate ? formatDate(snap.expectedCalvingDate) : '—'}
                  </td>
                  <td className="p-3 hidden md:table-cell tabular-nums">
                    {snap.ccsThousand != null
                      ? snap.ccsThousand.toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    {snap.mastitisDays != null && snap.mastitisDays > 0
                      ? <span className="text-red-500">{snap.mastitisDays}d</span>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}
