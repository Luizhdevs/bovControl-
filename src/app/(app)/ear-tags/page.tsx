import Link         from 'next/link'
import { redirect } from 'next/navigation'
import { auth }     from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { canAccess } from '@/lib/permissions'
import { Button }   from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { Plus, Printer, Tag } from 'lucide-react'

import { getEarTagTemplates } from '@/modules/ear-tags/queries'
import { TemplateCard }       from '@/modules/ear-tags/components/template-card'

export const metadata = { title: 'Etiquetas de Brinco | BovControl' }

export default async function EarTagsPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const [templates, canManage] = await Promise.all([
    getEarTagTemplates(farmId),
    canAccess(session.user.id, farmId, 'MANAGER'),
  ])

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Etiquetas de Brinco"
        description="Modelos de etiqueta para impressão em PDF"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" asChild>
              <Link href="/ear-tags/print">
                <Printer className="size-4 mr-1" />
                Imprimir
              </Link>
            </Button>
            {canManage && (
              <Button size="sm" className="h-9" asChild>
                <Link href="/ear-tags/new">
                  <Plus className="size-4 mr-1" />
                  Novo modelo
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <Tag className="size-12 text-muted-foreground/30" />
          <div>
            <p className="font-medium">Nenhum modelo criado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie um modelo para começar a imprimir etiquetas de brinco
            </p>
          </div>
          {canManage && (
            <Button asChild>
              <Link href="/ear-tags/new">
                <Plus className="size-4 mr-1" />
                Criar primeiro modelo
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              farmId={farmId}
              canEdit={canManage}
            />
          ))}
        </div>
      )}
    </div>
  )
}
