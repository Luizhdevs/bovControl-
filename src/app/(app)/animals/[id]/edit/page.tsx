import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

import { getAnimalById, getLotsForSelect, getAnimalsForParentSelect } from '@/modules/animals/queries'
import { AnimalForm } from '@/modules/animals/components/animal-form'
import { PageHeader } from '@/components/shared/page-header'

// ─── Metadata ──────────────────────────────────────────────

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return { title: `Editar Animal ${id} | BovControl` }
}

// ─── Page ──────────────────────────────────────────────────

export default async function EditAnimalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const farmId = farmUser.farmId

  // Carrega tudo em paralelo
  const [animal, lots, mothers, fathers] = await Promise.all([
    getAnimalById(id, farmId),
    getLotsForSelect(farmId),
    getAnimalsForParentSelect(farmId, 'FEMALE'),
    getAnimalsForParentSelect(farmId, 'MALE'),
  ])

  if (!animal) notFound()

  return (
    <div>
      <PageHeader
        title={`Editar ${animal.tag}`}
        description={animal.name ?? undefined}
        backHref={`/animals/${id}`}
      />

      <AnimalForm
        farmId={farmId}
        mode="edit"
        animal={animal}
        lots={lots}
        mothers={mothers.filter((m) => m.id !== id)} // Exclui o próprio animal
        fathers={fathers.filter((f) => f.id !== id)}
      />
    </div>
  )
}
