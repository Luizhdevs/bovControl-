import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { getAnimalsForReproduction } from '@/modules/reproduction/queries'
import { ReproductionForm } from '@/modules/reproduction/components/reproduction-form'
import type { AnimalForReproduction } from '@/modules/reproduction/types'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = { title: 'Novo Registro Reprodutivo | BovControl' }

// ─── Page ──────────────────────────────────────────────────

export default async function ReproductionNewPage({
  searchParams,
}: {
  searchParams: Promise<{ animalId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const params  = await searchParams
  const animals = await getAnimalsForReproduction(farmUser.farmId)

  const preSelected: AnimalForReproduction | undefined = params.animalId
    ? animals.find((a) => a.id === params.animalId)
    : undefined

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/reproduction"
        title="Novo Registro"
        description="Registrar evento reprodutivo"
      />

      {animals.length === 0 ? (
        <EmptyState
          icon={<span className="text-2xl">🐄</span>}
          title="Nenhuma fêmea ativa"
          description="Cadastre novilhas ou vacas para registrar eventos reprodutivos."
          action={{ label: 'Ver animais', href: '/animals' }}
        />
      ) : (
        <ReproductionForm
          farmId={farmUser.farmId}
          animals={animals}
          preSelectedAnimal={preSelected}
          redirectTo="/reproduction"
        />
      )}
    </div>
  )
}
