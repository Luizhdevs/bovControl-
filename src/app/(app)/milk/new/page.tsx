import { redirect }   from 'next/navigation'
import { auth }        from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma }      from '@/lib/prisma'

import { MilkRegisterForm } from '@/modules/milk/components/milk-register-form'
import { PageHeader }       from '@/components/shared/page-header'

// ─── Metadata ──────────────────────────────────────────────────

export const metadata = { title: 'Registrar Ordenha | BovControl' }

// ─── Page ──────────────────────────────────────────────────────

export default async function MilkNewPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  return (
    <div className="space-y-5">
      <PageHeader
        backHref="/milk"
        title="Registrar Ordenha"
        description="Nova sessão de produção"
      />

      <MilkRegisterForm
        farmId={activeFarm.farmId}
        redirectTo="/milk"
      />
    </div>
  )
}
