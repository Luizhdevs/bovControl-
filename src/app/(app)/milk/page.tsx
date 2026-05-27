import { redirect }    from 'next/navigation'
import Link            from 'next/link'
import { Suspense }    from 'react'
import { auth }        from '@/lib/auth'
import { prisma }      from '@/lib/prisma'
import { History }     from 'lucide-react'

import { getDailyMilkSummary }   from '@/modules/milk/queries'
import { MilkDailySummary }      from '@/modules/milk/components/milk-daily-summary'
import { MilkQuickRegister }     from '@/modules/milk/components/milk-quick-register'
import { PageHeader }            from '@/components/shared/page-header'
import { SectionCard }           from '@/components/shared/section-card'
import { formatDate }            from '@/lib/utils'
import MilkLoading               from './loading'

// ─── Metadata ──────────────────────────────────────────────────

export const metadata = { title: 'Produção de Leite | BovControl' }

// ─── Inner async component (Suspense boundary) ─────────────────

async function MilkDashboardContent({ farmId }: { farmId: string }) {
  const summary = await getDailyMilkSummary(farmId)
  const today   = formatDate(summary.date)

  return (
    <div className="space-y-4">

      {/* Resumo diário */}
      <SectionCard
        title="Hoje"
        subtitle={today}
        action={
          <Link
            href="/milk/history"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <History className="size-3.5" />
            Histórico
          </Link>
        }
      >
        <MilkDailySummary summary={summary} />
      </SectionCard>

      {/* Registro rápido */}
      <MilkQuickRegister farmId={farmId} />

      {/* Links de ação */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/milk/new"
          className="rounded-xl border border-dashed border-primary/40 p-4 flex flex-col items-center gap-2 text-primary hover:bg-primary/5 transition-colors text-center"
        >
          <span className="text-2xl">🥛</span>
          <span className="text-sm font-medium">Formulário completo</span>
        </Link>
        <Link
          href="/milk/history"
          className="rounded-xl border border-dashed border-border p-4 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors text-center"
        >
          <History className="size-6" />
          <span className="text-sm font-medium">Ver histórico</span>
        </Link>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────

export default async function MilkPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) redirect('/onboarding')

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Produção de Leite"
        description="Controle de ordenha diária"
      />

      <Suspense fallback={<MilkLoading />}>
        <MilkDashboardContent farmId={farmUser.farmId} />
      </Suspense>
    </div>
  )
}
