import { notFound, redirect } from 'next/navigation'
import { auth }     from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { canAccess } from '@/lib/permissions'
import { PageHeader } from '@/components/shared/page-header'
import { TemplateForm } from '@/modules/ear-tags/components/template-form'
import { getEarTagTemplateById } from '@/modules/ear-tags/queries'

export const metadata = { title: 'Editar modelo de etiqueta | BovControl' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditEarTagTemplatePage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, farm } = activeFarm

  const ok = await canAccess(session.user.id, farmId, 'MANAGER')
  if (!ok) redirect('/ear-tags')

  const { id } = await params
  const template = await getEarTagTemplateById(id, farmId)
  if (!template) notFound()

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        backHref="/ear-tags"
        title="Editar modelo"
        description={template.name}
      />
      <TemplateForm farmId={farmId} farmName={farm.name} initial={template} />
    </div>
  )
}
