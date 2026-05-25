import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

import { getLotsForSelect, getAnimalsForParentSelect } from '@/modules/animals/queries'
import { AnimalForm }  from '@/modules/animals/components/animal-form'
import { PageHeader }  from '@/components/shared/page-header'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = {
  title: 'Novo Animal | BovControl',
}

// ─── Page ──────────────────────────────────────────────────

export default async function NewAnimalPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  const farmId = farmUser.farmId

  // Carrega dados necessários para o form em paralelo
  const [lots, mothers, fathers] = await Promise.all([
    getLotsForSelect(farmId),
    getAnimalsForParentSelect(farmId, 'FEMALE'),
    getAnimalsForParentSelect(farmId, 'MALE'),
  ])

  return (
    <div>
      <PageHeader
        title="Novo Animal"
        description="Cadastre um novo animal na fazenda"
        backHref="/animals"
      />

      <AnimalForm
        farmId={farmId}
        mode="create"
        lots={lots}
        mothers={mothers}
        fathers={fathers}
      />
    </div>
  )
}
