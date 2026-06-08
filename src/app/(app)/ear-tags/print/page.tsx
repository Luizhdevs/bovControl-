import { redirect } from 'next/navigation'
import { auth }     from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { canAccess } from '@/lib/permissions'
import { PageHeader }  from '@/components/shared/page-header'
import { PrintForm }   from '@/modules/ear-tags/components/print-form'
import { getEarTagTemplates, getAnimalsForEarTagPrint } from '@/modules/ear-tags/queries'

export const metadata = { title: 'Imprimir etiquetas | BovControl' }

interface PageProps {
  searchParams: Promise<Record<string, string>>
}

export default async function PrintEarTagsPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const ok = await canAccess(session.user.id, farmId, 'WORKER')
  if (!ok) redirect('/ear-tags')

  const params = await searchParams

  const [templates, animals] = await Promise.all([
    getEarTagTemplates(farmId),
    getAnimalsForEarTagPrint(farmId),
  ])

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        backHref="/ear-tags"
        title="Imprimir etiquetas"
        description="Selecione o modelo, os animais e gere o PDF"
      />

      {templates.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="font-medium">Nenhum modelo disponível</p>
          <p className="text-sm text-muted-foreground">
            Crie pelo menos um modelo antes de imprimir etiquetas.
          </p>
        </div>
      ) : (
        <PrintForm
          templates={templates}
          animals={animals}
          defaultTemplateId={params['templateId']}
          defaultAnimalId={params['animalId']}
        />
      )}
    </div>
  )
}
