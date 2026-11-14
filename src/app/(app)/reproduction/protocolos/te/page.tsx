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
import type { TEParticipationEntry } from '@/modules/reproduction/te-queries'

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

// ─── Linha de animal (reutilizada nas seções P30 e P60) ────

function AnimalRow({ p }: { p: TEParticipationEntry }) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium hover:underline">
            {p.tag}
          </Link>
          {p.name && <span className="text-xs text-muted-foreground truncate">{p.name}</span>}
        </div>
        {(p.donor || p.ovaQuality || p.sexo) && (
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 flex-wrap">
            {p.donor && <span>{p.donor}</span>}
            {p.ovaQuality && <span>· {p.ovaQuality}</span>}
            {p.sexo && (
              <span className="rounded px-1 py-px bg-muted text-[10px] font-mono">{p.sexo}</span>
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
          currentDGStage={p.currentDGStage}
          sexagemResult={p.sexagemResult}
        />
      </div>
    </div>
  )
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

  const pendingWithdrawal = protocol.participations.filter((p) => p.currentDGStage === 'PENDING_WITHDRAWAL')
  const pendingTE         = protocol.participations.filter((p) => p.currentDGStage === 'PENDING_TE')
  const noResponse        = protocol.participations.filter((p) => p.currentDGStage === 'TE_NO_RESPONSE')
  const waitingP30        = protocol.participations.filter((p) => p.currentDGStage === 'WAITING_P30')
  const waitingP60        = protocol.participations.filter((p) => p.currentDGStage === 'WAITING_P60')
  const completed         = protocol.participations.filter((p) => p.currentDGStage === 'PRENHA')
  const discontinued      = protocol.participations.filter((p) => p.currentDGStage === 'DISCONTINUED')
  const inProtocol        = pendingWithdrawal.length + pendingTE.length + noResponse.length + waitingP30.length + waitingP60.length

  return (
    <div className="space-y-4">
      {/* Resumo do protocolo */}
      <SectionCard title="Protocolo" subtitle={`TE ${fmt(protocol.teDate)}`}>
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
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-emerald-500 tabular-nums">{completed.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Prenhes</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-sky-500 tabular-nums">{inProtocol}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Em protocolo</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-violet-500 tabular-nums">{waitingP30.length + waitingP60.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Aguard. DG</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-zinc-400 tabular-nums">{discontinued.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Descont.</div>
        </div>
      </div>

      {/* Implante inserido — aguardando Dia 8 */}
      {pendingWithdrawal.length > 0 && (
        <SectionCard title="Aguardando Dia 8 — Hormônios" subtitle={`${pendingWithdrawal.length} receptora${pendingWithdrawal.length !== 1 ? 's' : ''} · SINCROCIO + SINCROCP + SINCROECG`} noPadding>
          <div className="divide-y divide-border/40">
            {pendingWithdrawal.map((p) => (
              <AnimalRow key={p.participationId} p={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Hormônios aplicados — aguardando TE */}
      {pendingTE.length > 0 && (
        <SectionCard title="Aguardando TE" subtitle={`${pendingTE.length} · hormônios ✓`} noPadding>
          <div className="divide-y divide-border/40">
            {pendingTE.map((p) => (
              <AnimalRow key={p.participationId} p={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Sem resposta ao TE */}
      {noResponse.length > 0 && (
        <SectionCard title="Sem resposta ao TE" subtitle={`${noResponse.length} · aguardando decisão`} noPadding>
          <div className="divide-y divide-border/40">
            {noResponse.map((p) => (
              <AnimalRow key={p.participationId} p={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Receptoras aguardando DG P30 */}
      {waitingP30.length > 0 && (
        <SectionCard title="Aguardando DG P30" subtitle={`${waitingP30.length} receptora${waitingP30.length !== 1 ? 's' : ''}`} noPadding>
          <div className="divide-y divide-border/40">
            {waitingP30.map((p) => (
              <AnimalRow key={p.participationId} p={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Receptoras aguardando DG P60 */}
      {waitingP60.length > 0 && (
        <SectionCard title="Aguardando DG P60" subtitle={`${waitingP60.length} · DG P30 ✓`} noPadding>
          <div className="divide-y divide-border/40">
            {waitingP60.map((p) => (
              <AnimalRow key={p.participationId} p={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Prenhes confirmadas (DG P60) */}
      {completed.length > 0 && (
        <SectionCard title="Prenhes confirmadas" subtitle={`${completed.length} · DG P60 ✓`} noPadding>
          <div className="divide-y divide-border/40">
            {completed.map((p) => (
              <div key={p.participationId} className="flex items-center justify-between px-4 py-2.5 gap-3">
                <div className="flex items-center gap-2">
                  <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium hover:underline">
                    {p.tag}
                  </Link>
                  {p.name && <span className="text-xs text-muted-foreground">{p.name}</span>}
                  {p.sexo && (
                    <span className="rounded px-1 py-px bg-muted text-[10px] font-mono">{p.sexo}</span>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  p.sexagemResult === 'FEMALE' ? 'bg-pink-500/15 text-pink-600 dark:text-pink-400' :
                  p.sexagemResult === 'MALE'   ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' :
                  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {p.sexagemResult === 'FEMALE' ? '♀ Bezerra' :
                   p.sexagemResult === 'MALE'   ? '♂ Bezerro' :
                   'Prenha ✓'}
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
          {([
            protocol.startDate && { label: 'Dia 0 — Implante', date: fmt(protocol.startDate), done: pendingWithdrawal.length === 0 || !!protocol.startDate },
            protocol.withdrawalDate && { label: 'Dia 8 — Hormônios', date: fmt(protocol.withdrawalDate), done: protocol.participations.some((p) => p.withdrawalDone) },
            protocol.opuDate && { label: 'OPU', date: fmt(protocol.opuDate), done: true },
            { label: 'TE', date: fmt(protocol.teDate), done: protocol.participations.some((p) => p.teResponse !== null) },
            { label: 'DG P30', date: fmtRange(protocol.dgP30Start, protocol.dgP30End), done: waitingP60.length + completed.length > 0 },
            { label: 'DG P60 / Sexagem', date: fmtRange(protocol.dgP60Start, protocol.dgP60End), done: completed.length > 0 },
            { label: 'Parto previsto', date: fmt(protocol.prevParto), done: false },
          ] as ({ label: string; date: string; done: boolean } | false | null | undefined)[])
            .filter(Boolean)
            .map((step) => {
              const s = step as { label: string; date: string; done: boolean }
              return (
                <li key={s.label} className="ml-4">
                  <span className={`absolute -left-1.5 mt-0.5 flex size-3 items-center justify-center rounded-full border ${
                    s.done ? 'bg-emerald-500 border-emerald-500' : 'bg-background border-border'
                  }`} />
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-medium ${s.done ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {s.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{s.date}</span>
                  </div>
                </li>
              )
            })}
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
