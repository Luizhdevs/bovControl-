import { redirect }    from 'next/navigation'
import Link            from 'next/link'
import { Suspense }    from 'react'
import { auth }        from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma }      from '@/lib/prisma'
import { History }     from 'lucide-react'

import { getDailyMilkSummary }   from '@/modules/milk/queries'
import { MilkDailySummary }      from '@/modules/milk/components/milk-daily-summary'
import { PageHeader }            from '@/components/shared/page-header'
import { SectionCard }           from '@/components/shared/section-card'
import { Button }                from '@/components/ui/button'
import { formatDate }            from '@/lib/utils'
import { MilkIcon }              from 'lucide-react'
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

      {/* Botão principal → form completo com seleção de participantes */}
      <Button asChild size="lg" className="w-full h-13 text-base font-semibold gap-2">
        <Link href="/milk/new">
          <MilkIcon className="size-5" />
          Registrar Ordenha
        </Link>
      </Button>

      {/* Link histórico */}
      <Link
        href="/milk/history"
        className="rounded-xl border border-dashed border-border p-4 flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
      >
        <History className="size-5" />
        <span className="text-sm font-medium">Ver histórico completo</span>
      </Link>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────

export default async function MilkPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        title="Produção de Leite"
        description="Controle de ordenha diária"
      />

      <Suspense fallback={<MilkLoading />}>
        <MilkDashboardContent farmId={activeFarm.farmId} />
      </Suspense>
    </div>
  )
}
