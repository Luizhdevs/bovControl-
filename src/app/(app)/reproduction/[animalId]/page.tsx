import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma } from '@/lib/prisma'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { getCategoryLabel } from '@/modules/shared/domain/animal-labels'
import {
  getAnimalReproductionSummary,
  getReproductionsByAnimal,
} from '@/modules/reproduction/queries'
import { PregnancyStatusBadge } from '@/modules/reproduction/components/pregnancy-status-badge'
import { ExpectedCalvingCard } from '@/modules/reproduction/components/expected-calving-card'
import { ReproductionTimeline } from '@/modules/reproduction/components/reproduction-timeline'

// ─── Metadata dinâmica ─────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animalId: string }>
}) {
  const { animalId } = await params
  const session = await auth()
  if (!session) return {}

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return {}

  const animal = await prisma.animal.findFirst({
    where:  { id: animalId, farmId: activeFarm.farmId },
    select: { tag: true, name: true },
  })
  if (!animal) return { title: 'Reprodução | BovControl' }

  const display = animal.name ? `${animal.tag} · ${animal.name}` : animal.tag
  return { title: `Reprodução — ${display} | BovControl` }
}

// ─── Page ──────────────────────────────────────────────────

export default async function ReproductionAnimalPage({
  params,
}: {
  params: Promise<{ animalId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { animalId } = await params

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm
  const canDelete        = ['OWNER', 'MANAGER'].includes(role)

  const [summary, records] = await Promise.all([
    getAnimalReproductionSummary(animalId, farmId),
    getReproductionsByAnimal(animalId, farmId, 50),
  ])

  if (!summary) notFound()

  const { animal, pregnancyStatus, expectedCalvingDate, lastInseminationDate, totalEvents } = summary
  const categoryLabel = getCategoryLabel(animal.category, animal.sex)
  const isActive      = animal.status === 'ACTIVE'

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        backHref="/reproduction"
        title={animal.name ?? animal.tag}
        description={`${animal.tag} · ${categoryLabel}${animal.lot ? ` · ${animal.lot.name}` : ''}`}
      />

      {/* Status de prenhez + métricas */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Status reprodutivo</span>
          <PregnancyStatusBadge status={pregnancyStatus} />
        </div>

        {lastInseminationDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Última inseminação</span>
            <span className="text-foreground tabular-nums">
              {new Date(lastInseminationDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total de eventos</span>
          <span className="text-foreground font-medium tabular-nums">{totalEvents}</span>
        </div>
      </div>

      {/* Card de parto previsto */}
      {pregnancyStatus === 'pregnant' && expectedCalvingDate && summary.lastCheckDate && (
        <ExpectedCalvingCard
          expectedCalvingDate={expectedCalvingDate}
          confirmedAt={summary.lastCheckDate}
        />
      )}

      {/* Botão registrar */}
      {isActive && (
        <Button asChild className="w-full h-12 gap-2">
          <Link href={`/reproduction/new?animalId=${animal.id}`}>
            <Plus className="size-4" />
            Registrar evento
          </Link>
        </Button>
      )}

      {/* Timeline de eventos */}
      <ReproductionTimeline
        records={records}
        farmId={farmId}
        showAnimal={false}
        canDelete={canDelete}
      />
    </div>
  )
}
