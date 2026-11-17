import { Suspense }      from 'react'
import { redirect }      from 'next/navigation'
import Link              from 'next/link'
import { ArrowLeft, Syringe, Plus, ChevronDown } from 'lucide-react'
import { format }        from 'date-fns'
import { ptBR }          from 'date-fns/locale'
import { auth }          from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { PageHeader }    from '@/components/shared/page-header'
import { SectionCard }   from '@/components/shared/section-card'
import { EmptyState }    from '@/components/shared/empty-state'
import { Button }        from '@/components/ui/button'
import {
  getIATFProtocolList,
  getIATFProtocolDetail,
} from '@/modules/reproduction/iatf-queries'
import { IATFStepButton } from './step-update-button'
import type { IATFParticipationEntry } from '@/modules/reproduction/iatf-queries'

export const metadata = { title: 'Protocolos IATF | BovControl' }

function fmt(d: Date | null | undefined) {
  if (!d) return '—'
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

function fmtRange(start: Date | null | undefined, end: Date | null | undefined) {
  if (!start && !end) return '—'
  if (!end) return fmt(start)
  return `${fmt(start)} a ${fmt(end)}`
}

// ─── Linha de animal ────────────────────────────────────────

function AnimalRow({ p }: { p: IATFParticipationEntry }) {
  return (
    <div className="flex items-start justify-between px-4 py-3 gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium hover:underline">
            {p.tag}
          </Link>
          {p.name && <span className="text-xs text-muted-foreground truncate">{p.name}</span>}
        </div>
        {p.touro && (
          <div className="text-xs text-muted-foreground mt-0.5">
            Sêmen: {p.touro}
          </div>
        )}
      </div>
      <div className="shrink-0 pt-0.5">
        <IATFStepButton
          participationId={p.participationId}
          currentStage={p.currentStage}
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
  farmId:     string
}) {
  const protocol = await getIATFProtocolDetail(protocolId, farmId)

  if (!protocol) {
    return (
      <EmptyState
        icon={<Syringe className="size-8 text-muted-foreground" />}
        title="Protocolo não encontrado"
        description="Selecione outro protocolo."
      />
    )
  }

  const pendingD8    = protocol.participations.filter((p) => p.currentStage === 'PENDING_D8')
  const pendingIA    = protocol.participations.filter((p) => p.currentStage === 'PENDING_IA')
  const waitingDG    = protocol.participations.filter((p) => p.currentStage === 'WAITING_DG')
  const prenhas      = protocol.participations.filter((p) => p.currentStage === 'PRENHA')
  const vacias       = protocol.participations.filter((p) => p.currentStage === 'VAZIA')
  const discontinued = protocol.participations.filter((p) => p.currentStage === 'DISCONTINUED')
  const inProtocol   = pendingD8.length + pendingIA.length + waitingDG.length

  const confirmRate  = protocol.totalAnimals > 0
    ? Math.round((protocol.confirmed / protocol.totalAnimals) * 100)
    : 0

  return (
    <div className="space-y-4">
      {/* Resumo do protocolo */}
      <SectionCard title="Protocolo" subtitle={`IATF · IA ${fmt(protocol.d10Date)}`}>
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">D0 — Implante P4</span>
            <span className="font-medium">{fmt(protocol.d0Date)}</span>
          </div>
          {protocol.d8Date && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">D8 — Hormônios</span>
              <span className="font-medium">{fmt(protocol.d8Date)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">D10 — IA</span>
            <span className="font-medium">{fmt(protocol.d10Date)}</span>
          </div>
          {protocol.touro && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground shrink-0">Sêmen / Touro</span>
              <span className="font-medium text-right text-xs">{protocol.touro}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">DG previsto</span>
            <span>{fmtRange(protocol.dgStart, protocol.dgEnd)}</span>
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
          <div className="text-xl font-bold text-emerald-500 tabular-nums">{prenhas.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Prenhes</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-sky-500 tabular-nums">{inProtocol}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Em protocolo</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-red-400 tabular-nums">{vacias.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Vazias</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold tabular-nums">{confirmRate}%</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">Prenhes</div>
        </div>
      </div>

      {/* Aguardando D8 */}
      {pendingD8.length > 0 && (
        <SectionCard
          title="Aguardando D8 — Hormônios de cio"
          subtitle={`${pendingD8.length} animal${pendingD8.length !== 1 ? 'is' : ''} · implante ativo`}
          noPadding
        >
          <div className="divide-y divide-border/40">
            {pendingD8.map((p) => <AnimalRow key={p.participationId} p={p} />)}
          </div>
        </SectionCard>
      )}

      {/* D8 feito, aguardando IA */}
      {pendingIA.length > 0 && (
        <SectionCard
          title="Aguardando IA — D10"
          subtitle={`${pendingIA.length} · D8 ✓`}
          noPadding
        >
          <div className="divide-y divide-border/40">
            {pendingIA.map((p) => <AnimalRow key={p.participationId} p={p} />)}
          </div>
        </SectionCard>
      )}

      {/* Aguardando DG */}
      {waitingDG.length > 0 && (
        <SectionCard
          title="Aguardando DG"
          subtitle={`${waitingDG.length} · IA ✓`}
          noPadding
        >
          <div className="divide-y divide-border/40">
            {waitingDG.map((p) => <AnimalRow key={p.participationId} p={p} />)}
          </div>
        </SectionCard>
      )}

      {/* Prenhes confirmadas */}
      {prenhas.length > 0 && (
        <SectionCard
          title="Prenhes confirmadas"
          subtitle={`${prenhas.length} · DG ✓`}
          noPadding
        >
          <div className="divide-y divide-border/40">
            {prenhas.map((p) => (
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

      {/* Vazias (DG negativo) */}
      {vacias.length > 0 && (
        <SectionCard
          title="DG Negativo — Vazias"
          subtitle={`${vacias.length}`}
          noPadding
        >
          <div className="divide-y divide-border/40">
            {vacias.map((p) => (
              <div key={p.participationId} className="flex items-start justify-between px-4 py-2.5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/reproduction/${p.animalId}`} className="text-sm font-medium text-muted-foreground hover:underline">
                      {p.tag}
                    </Link>
                    {p.name && <span className="text-xs text-muted-foreground">{p.name}</span>}
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 font-medium shrink-0">
                  Vazia
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

      {/* Calendário do protocolo */}
      <SectionCard title="Calendário">
        <ol className="relative border-l border-border ml-2 space-y-4">
          {([
            { label: 'D0 — Implante P4',    date: fmt(protocol.d0Date),  done: true },
            { label: 'D8 — Hormônios de cio', date: fmt(protocol.d8Date), done: pendingIA.length > 0 || waitingDG.length > 0 || prenhas.length > 0 },
            { label: 'D10 — IA',             date: fmt(protocol.d10Date), done: waitingDG.length > 0 || prenhas.length > 0 },
            { label: 'DG',                   date: fmtRange(protocol.dgStart, protocol.dgEnd), done: prenhas.length > 0 },
            { label: 'Parto previsto',        date: fmt(protocol.prevParto), done: false },
          ] as { label: string; date: string; done: boolean }[])
            .map((step) => (
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

async function IATFPageContent({
  farmId,
  selectedId,
}: {
  farmId:     string
  selectedId: string | null
}) {
  const protocols = await getIATFProtocolList(farmId)

  if (protocols.length === 0) {
    return (
      <EmptyState
        icon={<Syringe className="size-8 text-muted-foreground" />}
        title="Nenhum protocolo IATF"
        description="Crie um novo protocolo para iniciar a gestão de IATF."
      />
    )
  }

  const activeId = selectedId ?? protocols[0]!.id
  const active   = protocols.find((p) => p.id === activeId) ?? protocols[0]!

  return (
    <div className="space-y-4">
      {/* Seletor de protocolo */}
      {protocols.length > 1 && (
        <SectionCard title="Protocolos" noPadding>
          <div className="divide-y divide-border/40">
            {protocols.map((p) => (
              <Link
                key={p.id}
                href={`/reproduction/protocolos/iatf?id=${p.id}`}
                className={`flex items-center justify-between px-4 py-3 transition-colors ${
                  p.id === active.id ? 'bg-muted/40' : 'hover:bg-muted/20'
                }`}
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    IA {fmt(p.d10Date)} · {p.totalAnimals} animais
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

      {protocols.length === 1 && (
        <div className="flex items-center gap-2 px-1">
          <Syringe className="size-4 text-primary" />
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

export default async function IATFProtocolPage({
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
        title="Protocolos IATF"
        description="Inseminação Artificial em Tempo Fixo"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/reproduction">
                <ArrowLeft className="size-4 mr-1.5" />
                Reprodução
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/reproduction/protocolos/iatf/novo">
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
            <div className="grid grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card h-16 animate-pulse" />
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card h-64 animate-pulse" />
          </div>
        }
      >
        <IATFPageContent farmId={activeFarm.farmId} selectedId={id ?? null} />
      </Suspense>
    </div>
  )
}
