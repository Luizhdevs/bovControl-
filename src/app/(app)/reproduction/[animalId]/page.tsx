import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'
import { prisma } from '@/lib/prisma'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { SectionCard } from '@/components/shared/section-card'
import { getCategoryLabel } from '@/modules/shared/domain/animal-labels'
import {
  getAnimalReproductionSummary,
  getReproductionsByAnimal,
} from '@/modules/reproduction/queries'
import {
  getAnimalTEParticipations,
  type AnimalTEParticipation,
  type TECurrentStage,
} from '@/modules/reproduction/te-queries'
import { PregnancyStatusBadge } from '@/modules/reproduction/components/pregnancy-status-badge'
import { ExpectedCalvingCard } from '@/modules/reproduction/components/expected-calving-card'
import { ReproductionTimeline } from '@/modules/reproduction/components/reproduction-timeline'

// ─── Stage config ──────────────────────────────────────────

const TE_STAGE_CONFIG: Record<TECurrentStage, { label: string; className: string }> = {
  PENDING_WITHDRAWAL: { label: 'Aguardando Dia 8',    className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  PENDING_TE:         { label: 'Aguardando TE',       className: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  TE_NO_RESPONSE:     { label: 'Sem resposta ao TE',  className: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  WAITING_P30:        { label: 'Aguardando DG P30',   className: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  WAITING_P60:        { label: 'Aguardando DG P60',   className: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  PRENHA:             { label: 'Prenha ✓',            className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  ABORTED:            { label: 'Aborto',              className: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  DISCONTINUED:       { label: 'Descontinuada',       className: 'text-muted-foreground bg-muted border-border' },
}

function TEProtocolRow({ p }: { p: AnimalTEParticipation }) {
  const stage = TE_STAGE_CONFIG[p.currentDGStage]

  return (
    <Link
      href={`/reproduction/protocolos/te?id=${p.protocolId}`}
      className="block py-3 hover:bg-muted/30 transition-colors -mx-4 px-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-sm font-medium text-foreground truncate">{p.protocolName}</div>
          <div className="text-xs text-muted-foreground">
            TE: {format(new Date(p.teDate), "dd/MM/yyyy", { locale: ptBR })}
            {p.prevParto && (
              <> · Parto prev.: {format(new Date(p.prevParto), "dd/MM/yyyy", { locale: ptBR })}</>
            )}
          </div>
          {(p.touro || p.donor) && (
            <div className="text-xs text-muted-foreground space-x-2">
              {p.touro  && <span>Pai: <span className="text-foreground">{p.touro}</span></span>}
              {p.donor  && <span>Mãe: <span className="text-foreground">{p.donor}</span></span>}
            </div>
          )}
          {(p.ovaQuality || p.sexo || p.sexagemResult) && (
            <div className="text-xs text-muted-foreground space-x-2">
              {p.ovaQuality    && <span>Qualidade: <span className="text-foreground">{p.ovaQuality}</span></span>}
              {p.sexo          && <span>Sexo emb.: <span className="text-foreground">{p.sexo}</span></span>}
              {p.sexagemResult && (
                <span>
                  Sexagem:{' '}
                  <span className="text-foreground">
                    {p.sexagemResult === 'FEMALE' ? '♀ Bezerra' : p.sexagemResult === 'MALE' ? '♂ Bezerro' : 'Absorvida'}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
        <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${stage.className}`}>
          {stage.label}
        </span>
      </div>
    </Link>
  )
}

// ─── Metadata dinâmica ─────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animalId: string }>
}) {
  const { animalId } = await params
  const session = await auth()
  if (!session) return {}

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return {}

  const animal = await prisma.animal.findFirst({
    where:  { id: animalId, farmId: activeFarm.farmId },
    select: { tag: true, name: true },
  })
  if (!animal) return { title: 'Reprodução | BovControl' }

  const display = animal.name ? `${animal.tag} · ${animal.name}` : animal.tag
  return { title: `Reprodução — ${display} | BovControl` }
}

// ─── Page ──────────────────────────────────────────────────

export default async function ReproductionAnimalPage({
  params,
}: {
  params: Promise<{ animalId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { animalId } = await params

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm
  const canDelete        = ['OWNER', 'MANAGER'].includes(role)

  const [summary, records, teParticipations] = await Promise.all([
    getAnimalReproductionSummary(animalId, farmId),
    getReproductionsByAnimal(animalId, farmId, 50),
    getAnimalTEParticipations(animalId, farmId),
  ])

  if (!summary) notFound()

  const { animal, pregnancyStatus, expectedCalvingDate, lastInseminationDate, totalEvents } = summary
  const categoryLabel = getCategoryLabel(animal.category, animal.sex)
  const isActive      = animal.status === 'ACTIVE'

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        backHref="/reproduction"
        title={animal.name ?? animal.tag}
        description={`${animal.tag} · ${categoryLabel}${animal.lot ? ` · ${animal.lot.name}` : ''}`}
      />

      {/* Status de prenhez + métricas */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Status reprodutivo</span>
          <PregnancyStatusBadge status={pregnancyStatus} />
        </div>

        {lastInseminationDate && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Última inseminação</span>
            <span className="text-foreground tabular-nums">
              {new Date(lastInseminationDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total de eventos</span>
          <span className="text-foreground font-medium tabular-nums">{totalEvents}</span>
        </div>
      </div>

      {/* Card de parto previsto */}
      {pregnancyStatus === 'pregnant' && expectedCalvingDate && summary.lastCheckDate && (
        <ExpectedCalvingCard
          expectedCalvingDate={expectedCalvingDate}
          confirmedAt={summary.lastCheckDate}
        />
      )}

      {/* Protocolos TE */}
      {teParticipations.length > 0 && (
        <SectionCard
          title="Protocolos TE"
          subtitle={`${teParticipations.length} ${teParticipations.length === 1 ? 'protocolo' : 'protocolos'}`}
          noPadding
        >
          <div className="px-4 divide-y divide-border/40">
            {teParticipations.map((p) => (
              <TEProtocolRow key={p.participationId} p={p} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Botão registrar */}
      {isActive && (
        <Button asChild className="w-full h-12 gap-2">
          <Link href={`/reproduction/new?animalId=${animal.id}`}>
            <Plus className="size-4" />
            Registrar evento
          </Link>
        </Button>
      )}

      {/* Timeline de eventos */}
      <ReproductionTimeline
        records={records}
        farmId={farmId}
        showAnimal={false}
        canDelete={canDelete}
      />
    </div>
  )
}
