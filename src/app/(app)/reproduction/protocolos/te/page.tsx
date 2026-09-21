import { Suspense }      from 'react'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { ArrowLeft, FlaskConical, Plus, ChevronDown } from 'lucide-react'
import { format }        from 'date-fns'
import { ptBR }          from 'date-fns/locale'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }    from '@/components/shared/page-header'
import { SectionCard }   from '@/components/shared/section-card'
import { EmptyState }    from '@/components/shared/empty-state'
import { Button }        from '@/components/ui/button'
import {
  getTEProtocolList,
  getTEProtocolDetail,
} from '@/modules/reproduction/te-queries'
import { DGUpdateButton } from './dg-update-button'
import { MigrateButton }  from './migrate-button'

export const metadata = { title: 'Protocolos TE | BovControl' }

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

function fmtRange(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start && !end) return '—'
  if (!end) return fmt(start)
  return `${fmt(start)} a ${fmt(end)}`
}

// ─── Detalhe de um protocolo ────────────────────────────────

async function ProtocolDetail({
  protocolId,
  farmId,
}: {
  protocolId: string
  farmId: string
}) {
  const protocol = await getTEProtocolDetail(protocolId, farmId)

  if (!protocol) {
    return (
      <EmptyState
        icon={<FlaskConical className="size-8 text-muted-foreground" />}
        title="Protocolo não encontrado"
        description="Selecione outro protocolo."
      />
    )
  }

  const active       = protocol.participations.filter((p) => p.participationStatus === 'ACTIVE')
  const discontinued = protocol.participations.filter((p) => p.participationStatus === 'DISCONTINUED')
  const completed    = protocol.participations.filter((p) => p.participationStatus === 'COMPLETED')

  return (
    <div className="space-y-4">
      {/* Resumo do protocolo */}
      <SectionCard title="Protocolo" subtitle={`OPU ${fmt(protocol.opuDate)} · TE ${fmt(protocol.teDate)}`}>
        <div className="space-y-1.5 text-sm">
          {protocol.laboratorio && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Laboratório</span>
              <span className="font-medium text-right">{protocol.laboratorio}</span>
            </div>
          )}
          {protocol.touro && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Touro</span>
              <span className="font-medium text-right text-xs">{protocol.touro}</span>
            </div>
          )}
          {protocol.doadoras && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Doadoras</span>
              <span className="text-right text-xs">{protocol.doadoras}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">DG P30</span>
            <span>{fmtRange(protocol.dgP30Start, protocol.dgP30End)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">DG P60</span>
            <span>{fmtRange(protocol.dgP60Start, protocol.dgP60End)}</span>
          </div>
          {protocol.prevParto && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parto previsto</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {fmt(protocol.prevParto)}
              </span>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-emerald-500 tabular-nums">{completed.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Prenhes</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-amber-500 tabular-nums">{active.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Aguardando</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-zinc-400 tabular-nums">{discontinued.length}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Descont.</div>
        </div>
      </div>

      {/* Lista de receptoras ativas */}
      {active.length > 0 && (
        <SectionCard title="Receptoras" subtitle={`${active.length} em acompanhamento`} noPadding>
          <div className="divide-y divide-border/40">
            {active.map((p) => (
              <div key={p.participationId} className="flex items-start justify-between px-4 py-3 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium hover:underline">
                      {p.tag}
                    </Link>
                    {p.name && <span className="text-xs text-muted-foreground truncate">{p.name}</span>}
                  </div>
                  {(p.donor || p.ovaQuality) && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.donor}{p.ovaQuality ? ` · ${p.ovaQuality}` : ''}
                      {p.sexo && (
                        <span className="ml-1.5 rounded px-1 py-px bg-muted text-[10px] font-mono">{p.sexo}</span>
                      )}
                    </div>
                  )}
                  {p.dgResult && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">{p.dgResult}</div>
                  )}
                </div>
                <div className="shrink-0 pt-0.5">
                  <DGUpdateButton
                    participationId={p.participationId}
                    dgStage="DG_P30"
                    participationStatus={p.participationStatus}
                    dgStatus={p.dgStatus}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Prenhes confirmadas */}
      {completed.length > 0 && (
        <SectionCard title="Prenhes confirmadas" subtitle={`${completed.length}`} noPadding>
          <div className="divide-y divide-border/40">
            {completed.map((p) => (
              <div key={p.participationId} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="flex items-center gap-2">
                  <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium hover:underline">
                    {p.tag}
                  </Link>
                  {p.name && <span className="text-xs text-muted-foreground">{p.name}</span>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  Prenha ✓
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Descontinuadas */}
      {discontinued.length > 0 && (
        <SectionCard title="Descontinuadas" subtitle={`${discontinued.length}`} noPadding>
          <div className="divide-y divide-border/40">
            {discontinued.map((p) => (
              <div key={p.participationId} className="flex items-start justify-between px-4 py-2.5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium text-muted-foreground hover:underline">
                      {p.tag}
                    </Link>
                    {p.name && <span className="text-xs text-muted-foreground">{p.name}</span>}
                  </div>
                  {p.discontinuedReason && (
                    <div className="text-xs text-muted-foreground mt-0.5 italic">{p.discontinuedReason}</div>
                  )}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-500 font-medium shrink-0">
                  Descontinuada
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Timeline */}
      <SectionCard title="Calendário">
        <ol className="relative border-l border-border ml-2 space-y-4">
          {[
            { label: 'OPU',       date: fmt(protocol.opuDate),                          done: true },
            { label: 'TE',        date: fmt(protocol.teDate),                            done: true },
            { label: 'DG P30',    date: fmtRange(protocol.dgP30Start, protocol.dgP30End), done: completed.length + discontinued.length > 0 },
            { label: 'DG P60',    date: fmtRange(protocol.dgP60Start, protocol.dgP60End), done: false },
            { label: 'Parto',     date: fmt(protocol.prevParto),                         done: false },
          ].map((step) => (
            <li key={step.label} className="ml-4">
              <span className={`absolute -left-1.5 mt-0.5 flex size-3 items-center justify-center rounded-full border ${
                step.done ? 'bg-emerald-500 border-emerald-500' : 'bg-background border-border'
              }`} />
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

// ─── Conteúdo principal ─────────────────────────────────────

async function TEPageContent({
  farmId,
  selectedId,
}: {
  farmId:     string
  selectedId: string | null
}) {
  const protocols = await getTEProtocolList(farmId)

  if (protocols.length === 0) {
    return (
      <div className="space-y-4">
        <MigrateButton />
        <EmptyState
          icon={<FlaskConical className="size-8 text-muted-foreground" />}
          title="Nenhum protocolo TE"
          description="Crie um novo protocolo ou migre os dados do TE de Setembro/2026."
        />
      </div>
    )
  }

  const activeId  = selectedId ?? protocols[0]!.id
  const active    = protocols.find((p) => p.id === activeId) ?? protocols[0]!

  return (
    <div className="space-y-4">
      {/* Seletor de protocolo */}
      {protocols.length > 1 && (
        <SectionCard title="Protocolos" noPadding>
          <div className="divide-y divide-border/40">
            {protocols.map((p) => (
              <Link
                key={p.id}
                href={`/reproduction/protocolos/te?id=${p.id}`}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  p.id === active.id ? 'bg-muted/40' : 'hover:bg-muted/20'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    TE {fmt(p.teDate)} · {p.totalAnimals} animais
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    p.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-500/15 text-zinc-500'
                  }`}>
                    {p.status === 'ACTIVE' ? 'Ativo' : p.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                  </span>
                  {p.id === active.id && <ChevronDown className="size-4 text-muted-foreground" />}
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Chip com nome do protocolo selecionado quando há apenas 1 */}
      {protocols.length === 1 && (
        <div className="flex items-center gap-2 px-1">
          <FlaskConical className="size-4 text-violet-500" />
          <span className="text-sm font-medium">{active.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
            active.status === 'ACTIVE'
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-zinc-500/15 text-zinc-500'
          }`}>
            {active.status === 'ACTIVE' ? 'Ativo' : active.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
          </span>
        </div>
      )}

      <ProtocolDetail protocolId={active.id} farmId={farmId} />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────

export default async function TEProtocolPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const { id } = await searchParams

  return (
    <div className="space-y-4">
      <PageHeader
        title="Protocolos TE"
        description="Transferência de embriões"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reproduction">
                <ArrowLeft className="size-4 mr-1.5" />
                Reprodução
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/reproduction/protocolos/te/novo">
                <Plus className="size-4 mr-1.5" />
                Novo
              </Link>
            </Button>
          </div>
        }
      />

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card h-40 animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card h-16 animate-pulse" />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card h-64 animate-pulse" />
          </div>
        }
      >
        <TEPageContent farmId={activeFarm.farmId} selectedId={id ?? null} />
      </Suspense>
    </div>
  )
}
