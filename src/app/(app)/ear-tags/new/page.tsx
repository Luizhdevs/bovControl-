import { redirect } from 'next/navigation'
import { auth }     from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { canAccess } from '@/lib/permissions'
import { PageHeader } from '@/components/shared/page-header'
import { TemplateForm } from '@/modules/ear-tags/components/template-form'

export const metadata = { title: 'Novo modelo de etiqueta | BovControl' }

export default async function NewEarTagTemplatePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, farm } = activeFarm

  const ok = await canAccess(session.user.id, farmId, 'MANAGER')
  if (!ok) redirect('/ear-tags')

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        backHref="/ear-tags"
        title="Novo modelo de etiqueta"
        description="Configure as dimensões, campos e aparência da etiqueta"
      />
      <TemplateForm farmId={farmId} farmName={farm.name} />
    </div>
  )
}
