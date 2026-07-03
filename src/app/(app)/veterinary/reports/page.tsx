import { auth }           from '@/lib/auth'
import { redirect }        from 'next/navigation'
import { getActiveFarm }   from '@/lib/active-farm'
import Link                from 'next/link'
import { Plus, FileText, ChevronRight } from 'lucide-react'
import { getVeterinaryReports }  from '@/modules/veterinary/queries'
import { VeterinaryStatusBadge } from '@/modules/veterinary/components/veterinary-status-badge'
import { PageHeader }  from '@/components/shared/page-header'
import { formatDate }  from '@/lib/utils'
import { REPORT_SOURCE_LABELS } from '@/modules/veterinary/constants'

export const metadata = { title: 'Relatórios Veterinários | BovControl' }

export default async function VeterinaryReportsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm

  const isManager = ['OWNER', 'MANAGER'].includes(role)

  const { items, total } = await getVeterinaryReports(farmId)

  return (
    <div className="space-y-4">
      <PageHeader
        backHref="/veterinary"
        title="Relatórios"
        description={`${total} relatório${total !== 1 ? 's' : ''} veterinário${total !== 1 ? 's' : ''}`}
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

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center space-y-3">
          <FileText className="size-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhum relatório veterinário encontrado</p>
          {isManager && (
            <Link href="/veterinary/import" className="text-xs text-primary hover:underline">
              Importar relatório
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-border bg-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {REPORT_SOURCE_LABELS[report.sourceSystem as keyof typeof REPORT_SOURCE_LABELS] ?? report.sourceSystem}
                    </span>
                    <VeterinaryStatusBadge status={report.importStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(report.reportDate)}
                    {report.technicianName && ` · Téc: ${report.technicianName}`}
                  </p>
                </div>
                <Link
                  href={`/veterinary/reports/${report.id}`}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <ChevronRight className="size-5" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>{report.totalRows} animais</span>
                {report.matchedRows != null && (
                  <span>{report.matchedRows} vinculados</span>
                )}
                {report.unmatchedRows != null && report.unmatchedRows > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {report.unmatchedRows} sem vínculo
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/veterinary/reports/${report.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Ver detalhes
                </Link>
                {isManager && ['DRAFT', 'PARTIALLY_IMPORTED'].includes(report.importStatus) && (
                  <Link
                    href={`/veterinary/import/${report.id}/review`}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Continuar revisão
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
