import { redirect }   from 'next/navigation'
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'

import { MilkRegisterForm } from '@/modules/milk/components/milk-register-form'
import { PageHeader }       from '@/components/shared/page-header'

// ─── Metadata ──────────────────────────────────────────────────

export const metadata = { title: 'Registrar Ordenha | BovControl' }

// ─── Page ──────────────────────────────────────────────────────

export default async function MilkNewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/milk"
        title="Registrar Ordenha"
        description="Nova sessão de produção"
      />

      <MilkRegisterForm
        farmId={farmUser.farmId}
        redirectTo="/milk"
      />
    </div>
  )
}
