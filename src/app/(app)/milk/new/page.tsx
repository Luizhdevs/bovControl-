import { redirect }   from 'next/navigation'
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'

import { getAnimalsForMilkRegister } from '@/modules/milk/queries'
import { MilkRegisterForm }          from '@/modules/milk/components/milk-register-form'
import { PageHeader }                from '@/components/shared/page-header'
import { EmptyState }                from '@/components/shared/empty-state'
import { MilkIcon }                  from 'lucide-react'
import type { AnimalForMilk }        from '@/modules/milk/types'

// ─── Metadata ──────────────────────────────────────────────

export const metadata = { title: 'Registrar Leite | BovControl' }

// ─── Page ──────────────────────────────────────────────────

export default async function MilkNewPage({
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
  const animals = await getAnimalsForMilkRegister(farmUser.farmId)

  // Pré-seleciona animal vindo de ?animalId= (link da página do animal)
  const preSelected: AnimalForMilk | undefined = params.animalId
    ? animals.find((a) => a.id === params.animalId)
    : undefined

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/milk"
        title="Registrar Produção"
        description="Nova entrada de leite"
      />

      {animals.length === 0 ? (
        <EmptyState
          icon={<MilkIcon />}
          title="Nenhuma vaca ativa"
          description="Cadastre vacas ou novilhas para registrar a produção de leite."
          action={{ label: 'Ver animais', href: '/animals' }}
        />
      ) : (
        <MilkRegisterForm
          farmId={farmUser.farmId}
          animals={animals}
          preSelectedAnimal={preSelected}
          redirectTo="/milk"
        />
      )}
    </div>
  )
}
