import { auth }             from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { redirect }         from 'next/navigation'
import { prisma }           from '@/lib/prisma'
import { canAccess }        from '@/lib/permissions'
import { getPasturesByFarm } from '@/modules/pastures/queries'
import { PastureCard }      from '@/modules/pastures/components/pasture-card'
import { PageHeader }       from '@/components/shared/page-header'
import { Button }           from '@/components/ui/button'
import { Plus, MapPin }     from 'lucide-react'
import Link                 from 'next/link'

export const metadata = { title: 'Pastos | BovControl' }

export default async function PasturesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId } = activeFarm

  const [pastures, canManage] = await Promise.all([
    getPasturesByFarm(farmId),
    canAccess(session.user.id, farmId, 'MANAGER'),
  ])

  const active   = pastures.filter((p) => p.isActive)
  const inactive = pastures.filter((p) => !p.isActive)

  return (
    <div className="space-y-5 pb-6">
      <PageHeader
        title="Pastos"
        description={`${active.length} pasto${active.length !== 1 ? 's' : ''} ativo${active.length !== 1 ? 's' : ''}`}
        actions={
          canManage ? (
            <Button asChild size="sm" className="h-9">
              <Link href="/pastures/new">
                <Plus className="size-4 mr-1" />
                Novo
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Lista de pastos ativos */}
      {active.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhum pasto cadastrado ainda.
          </p>
          {canManage && (
            <Button asChild variant="outline" className="mt-4">
              <Link href="/pastures/new">Cadastrar pasto</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {active.map((pasture) => (
            <PastureCard
              key={pasture.id}
              pasture={pasture}
              farmId={farmId}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Pastos inativos (colapsados) */}
      {inactive.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 py-2">
            <span className="text-xs bg-muted px-2 py-0.5 rounded">{inactive.length}</span>
            Pastos inativos
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {inactive.map((pasture) => (
              <PastureCard
                key={pasture.id}
                pasture={pasture}
                farmId={farmId}
                canManage={canManage}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
