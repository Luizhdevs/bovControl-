import { auth }                    from '@/lib/auth'
import { redirect }                from 'next/navigation'
import { getActiveFarm }           from '@/lib/active-farm'
import { canAccess }               from '@/lib/permissions'
import { VeterinaryImportForm }    from '@/modules/veterinary/components/import-form'
import { PageHeader }              from '@/components/shared/page-header'
import { FileSpreadsheet }         from 'lucide-react'

export const metadata = { title: 'Importar Relatório Veterinário | BovControl' }

export default async function VeterinaryImportPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const allowed = await canAccess(session.user.id, activeFarm.farmId, 'MANAGER')
  if (!allowed) redirect('/')

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Importar Relatório Veterinário"
        description="PRODAP / ZIL — importação via CSV"
        backHref="/"
        actions={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1">
            <FileSpreadsheet className="size-3.5" />
            CSV
          </span>
        }
      />

      <VeterinaryImportForm />
    </div>
  )
}
