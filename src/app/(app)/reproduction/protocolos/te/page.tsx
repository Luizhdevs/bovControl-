import { Suspense }      from 'react'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }    from '@/components/shared/page-header'
import { SectionCard }   from '@/components/shared/section-card'
import { EmptyState }    from '@/components/shared/empty-state'
import { Button }        from '@/components/ui/button'
import { getTEProtocol } from '@/modules/reproduction/te-queries'
import { DGUpdateButton } from './dg-update-button'

export const metadata = { title: 'Protocolo TE | BovControl' }

// ─── Conteúdo assíncrono ────────────────────────────────────

async function TEContent({ farmId }: { farmId: string }) {
  const protocol = await getTEProtocol(farmId)

  if (!protocol) {
    return (
      <EmptyState
        icon={<FlaskConical className="size-8 text-muted-foreground" />}
        title="Nenhum protocolo TE ativo"
        description="Importe os dados do relatório TE para acompanhar aqui."
      />
    )
  }

  const confirmed = protocol.animals.filter((a) => a.status === 'CONFIRMED').length
  const failed    = protocol.animals.filter((a) => a.status === 'FAILED').length
  const pending   = protocol.animals.filter((a) => a.status === 'PENDING').length

  return (
    <div className="space-y-4">
      {/* Resumo do protocolo */}
      <SectionCard title="Protocolo" subtitle={`OPU ${protocol.opuDate} · TE ${protocol.teDate}`}>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Laboratório</span>
            <span className="font-medium text-right">{protocol.laboratorio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Touro</span>
            <span className="font-medium text-right text-xs">{protocol.touro}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DG P30</span>
            <span>{protocol.dgP30}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DG P60</span>
            <span>{protocol.dgP60}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Parto previsto</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{protocol.prevParto}</span>
          </div>
        </div>
      </SectionCard>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-emerald-500 tabular-nums">{confirmed}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Prenhes</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-amber-500 tabular-nums">{pending}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Aguardando</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-red-500 tabular-nums">{failed}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Vazias</div>
        </div>
      </div>

      {/* Lista de receptoras */}
      <SectionCard
        title="Receptoras"
        subtitle={`${protocol.animals.length} animais`}
        noPadding
      >
        <div className="divide-y divide-border/40">
          {protocol.animals.map((a) => (
            <div
              key={a.reproductionId}
              className="flex items-start justify-between px-4 py-3 gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/reproduction/${a.animalId}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {a.tag}
                  </Link>
                  {a.name && (
                    <span className="text-xs text-muted-foreground truncate">{a.name}</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {a.donor} · {a.ovaQuality}
                  {a.sexo && (
                    <span className="ml-1.5 rounded px-1 py-px bg-muted text-[10px] font-mono">
                      {a.sexo}
                    </span>
                  )}
                </div>
                {a.result && (
                  <div className="text-xs text-muted-foreground mt-0.5 italic">{a.result}</div>
                )}
              </div>

              <div className="shrink-0 pt-0.5">
                <DGUpdateButton
                  reproductionId={a.reproductionId}
                  animalTag={a.tag}
                  dgStage="DG_P30"
                  currentStatus={a.status}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Timeline das próximas etapas */}
      <SectionCard title="Calendário do protocolo">
        <ol className="relative border-l border-border ml-2 space-y-4">
          {[
            { label: 'OPU',        date: protocol.opuDate, done: true },
            { label: 'TE',         date: protocol.teDate,  done: true },
            { label: 'DG P30',     date: protocol.dgP30,   done: confirmed + failed > 0 },
            { label: 'DG P60',     date: protocol.dgP60,   done: false },
            { label: 'Sexagem',    date: 'Dez/2026',        done: false },
            { label: 'Parto',      date: protocol.prevParto, done: false },
          ].map((step) => (
            <li key={step.label} className="ml-4">
              <span
                className={`absolute -left-1.5 mt-0.5 flex size-3 items-center justify-center rounded-full border ${
                  step.done
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'bg-background border-border'
                }`}
              />
              <div className="flex items-baseline gap-2">
                <span className={`text-sm font-medium ${step.done ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground">{step.date}</span>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────

export default async function TEProtocolPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  return (
    <div className="space-y-4">
      <PageHeader
        title="Protocolo TE"
        description="Transferência de embriões — Eleva Embriões"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reproduction">
              <ArrowLeft className="size-4 mr-1.5" />
              Reprodução
            </Link>
          </Button>
        }
      />

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card h-36 animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card h-16 animate-pulse" />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card h-64 animate-pulse" />
          </div>
        }
      >
        <TEContent farmId={activeFarm.farmId} />
      </Suspense>
    </div>
  )
}
