import { auth }         from '@/lib/auth'
import { redirect }     from 'next/navigation'
import { getActiveFarm } from '@/lib/active-farm'
import { getAlerts }    from '@/modules/alerts/queries'
import { AlertCard } from '@/modules/alerts/components/alert-card'
import { PageHeader } from '@/components/shared/page-header'
import { Bell }        from 'lucide-react'
import Link            from 'next/link'
import { cn } from '@/lib/utils'
import type { AlertStatus } from '@/modules/alerts/types'

export const metadata = { title: 'Alertas | BovControl' }

const STATUS_TABS: { label: string; value: AlertStatus | undefined }[] = [
  { label: 'Pendentes',  value: 'PENDING'   },
  { label: 'Resolvidos', value: 'RESOLVED'  },
  { label: 'Ignorados',  value: 'DISMISSED' },
]

interface AlertsPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const params   = await searchParams
  const rawStatus = params.status
  const status   = (['PENDING', 'RESOLVED', 'DISMISSED'] as const).includes(rawStatus as AlertStatus)
    ? (rawStatus as AlertStatus)
    : 'PENDING'

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const alerts = await getAlerts(activeFarm.farmId, { status })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alertas"
        description="Acompanhe eventos e ações pendentes do rebanho"
      />

      {/* Tabs de status */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value ? `/alerts?status=${tab.value}` : '/alerts'}
            className={cn(
              'flex-1 text-center text-xs font-medium py-2 rounded-lg transition-colors',
              status === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Lista */}
      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {status === 'PENDING'
              ? 'Nenhum alerta pendente. Ótimo!'
              : status === 'RESOLVED'
              ? 'Nenhum alerta resolvido ainda.'
              : 'Nenhum alerta ignorado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </p>
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} farmId={activeFarm.farmId} />
          ))}
        </div>
      )}
    </div>
  )
}
