import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'

import { getAnimalById, getLotsForSelect }             from '@/modules/animals/queries'
import { getSnapshotHistoryForAnimalCard }             from '@/modules/veterinary/queries'
import { VeterinaryGroupBadge }                        from '@/modules/veterinary/components/veterinary-group-badge'
import { REPORT_SOURCE_LABELS }                        from '@/modules/veterinary/constants'
import { getAnimalMilkStats }                      from '@/modules/milk/queries'
import { getHealthEventsByAnimal }                 from '@/modules/health-events/queries'
import { getAnimalFeedHistory }                    from '@/modules/feed/queries'
import { getEntityHistory }                        from '@/modules/audit/queries'
import { AuditTimeline }                           from '@/modules/audit/components/audit-timeline'
import { AnimalFeedSection }                       from '@/modules/feed/components/animal-feed-section'
import { HealthEventTimeline }                     from '@/modules/health-events/components/health-event-timeline'
import { AnimalQuickActions, AddPhotoButton }  from '@/modules/animals/components/animal-quick-actions'
import { AnimalTimeline }      from '@/modules/animals/components/animal-timeline'
import { SectionCard, InfoRow, InfoRows } from '@/components/shared/section-card'
import { CategoryBadge, InseminationBadge } from '@/components/shared/status-badge'

import {
  cn,
  formatDate,
  formatWeight,
  formatLiters,
  calculateAge,
  BIRTH_TYPE_LABELS,
  LOT_TYPE_LABELS,
} from '@/lib/utils'
import { Scale, Heart, Camera, Wheat, ClipboardList, Tag, Stethoscope, Baby, ChevronLeft, Droplets } from 'lucide-react'

// ─── Metadata dinâmica ─────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) return {}

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) return {}

  const animal = await getAnimalById(id, activeFarm.farmId)
  if (!animal) return { title: 'Animal | BovControl' }

  return {
    title: `${animal.tag}${animal.name ? ` · ${animal.name}` : ''} | BovControl`,
  }
}

// ─── Page ──────────────────────────────────────────────────

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')
  const { farmId, role } = activeFarm

  const canViewAudit = role !== 'VIEWER'

  // Carrega dados em paralelo
  const [animal, lots, healthEvents, feedHistory, milkStats, auditHistory, vetHistory] =
    await Promise.all([
      getAnimalById(id, farmId),
      getLotsForSelect(farmId),
      getHealthEventsByAnimal(id, farmId, 10),
      getAnimalFeedHistory(id, farmId, 5),
      getAnimalMilkStats(id, farmId),
      canViewAudit ? getEntityHistory(id, farmId, 20) : Promise.resolve([]),
      getSnapshotHistoryForAnimalCard(id, farmId, 5),
    ])

  if (!animal) notFound()

  const vetSnapshot  = vetHistory[0] ?? null
  const primaryPhoto = animal.photos.find((p) => p.isPrimary)
  const lastWeight   = animal.weightRecords[0]
  const isActive     = animal.status === 'ACTIVE'

  const sexColor  = animal.sex === 'FEMALE' ? 'from-pink-500/20 to-purple-600/20' : 'from-sky-500/20 to-blue-600/20'
  const sexAccent = animal.sex === 'FEMALE' ? 'bg-pink-500' : 'bg-sky-500'

  return (
    <div className={cn('space-y-4', isActive ? 'pb-28' : 'pb-6')}>

      {/* ── HERO ─────────────────────────────────────── */}
      <div>
        {/* Navegação desktop — fora da foto */}
        <div className="hidden md:flex items-center justify-between mb-3">
          <Link
            href="/animals"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            Animais
          </Link>
          <Link
            href={`/ear-tags/print?animalId=${animal.id}`}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Tag className="size-3.5" />
            Etiqueta
          </Link>
        </div>

        {/* Foto / fundo — mobile: full-bleed; desktop: card arredondado */}
        <div className={cn(
          'relative overflow-hidden',
          'h-72 -mx-4',
          'md:h-[460px] md:mx-0 md:rounded-2xl',
        )}>
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.url}
              alt={`Foto de ${animal.tag}`}
              fill
              sizes="(min-width: 768px) calc(100vw - 224px), 100vw"
              className="object-cover object-center"
              priority
            />
          ) : (
            <div className={cn('absolute inset-0 bg-gradient-to-br', sexColor, 'flex items-center justify-center')}>
              <span className="text-[140px] font-black text-white/5 font-mono select-none leading-none">
                {animal.name?.[0]?.toUpperCase() ?? animal.tag.slice(-2)}
              </span>
            </div>
          )}

          {/* Gradiente base → topo — mais intenso no desktop para ler o texto */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Navegação mobile — overlay dentro da foto */}
          <div className="md:hidden absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-3">
            <Link
              href="/animals"
              className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors backdrop-blur-sm bg-black/25 rounded-full px-3 py-1.5"
            >
              <ChevronLeft className="size-4" />
              Animais
            </Link>
            <Link
              href={`/ear-tags/print?animalId=${animal.id}`}
              className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors backdrop-blur-sm bg-black/25 rounded-full px-3 py-1.5"
            >
              <Tag className="size-3.5" />
              Etiqueta
            </Link>
          </div>

          {/* Indicador de sexo */}
          <div className={cn(
            'absolute right-4 size-9 rounded-full flex items-center justify-center text-base font-bold text-white shadow-lg',
            'top-12 md:top-4',
            sexAccent,
          )}>
            {animal.sex === 'FEMALE' ? '♀' : '♂'}
          </div>

          {/* Identidade sobreposta na base */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-6 pb-4 md:pb-6">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-2xl md:text-4xl font-black text-white drop-shadow-lg leading-none">
                  {animal.tag}
                </p>
                {animal.name && (
                  <p className="text-white/75 text-base md:text-xl mt-1 truncate drop-shadow">
                    {animal.name}
                  </p>
                )}
              </div>
              {animal.status !== 'ACTIVE' && (
                <span className={cn(
                  'shrink-0 text-xs font-semibold rounded-full px-3 py-1',
                  animal.status === 'SOLD' ? 'bg-amber-500/90 text-white' : 'bg-red-500/90 text-white',
                )}>
                  {animal.status === 'SOLD' ? 'Vendido' : 'Óbito'}
                </span>
              )}
            </div>

            {/* Chips — apenas desktop, sobrepostos na foto */}
            <div className="hidden md:flex flex-wrap gap-2 mt-3">
              <CategoryBadge category={animal.category} size="lg" />
              {animal.lot && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white border border-white/20">
                  {animal.lot.name}
                  <span className="text-white/60">· {LOT_TYPE_LABELS[animal.lot.type]}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white border border-white/20">
                {animal.breed}
              </span>
              {animal.birthType === 'INSEMINATION' && (
                <InseminationBadge size="lg" />
              )}
            </div>
          </div>
        </div>

        {/* Chips — apenas mobile, abaixo da foto */}
        <div className="md:hidden px-4 pt-3 flex flex-wrap gap-2">
          <CategoryBadge category={animal.category} size="lg" />
          {animal.lot && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground">
              {animal.lot.name}
              <span className="text-muted-foreground/50">· {LOT_TYPE_LABELS[animal.lot.type]}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground">
            {animal.breed}
          </span>
          {animal.birthType === 'INSEMINATION' && (
            <InseminationBadge size="lg" />
          )}
        </div>
      </div>

      {/* ── STATS RÁPIDAS ───────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10', value: animal._count.milkRecords, label: 'Registros de Leite' },
          { icon: Scale,    color: 'text-blue-400', bg: 'bg-blue-500/10',  value: animal.weightRecords.length,  label: 'Pesagens' },
          { icon: Heart,    color: 'text-red-400',  bg: 'bg-red-500/10',   value: animal._count.healthEvents,   label: 'Eventos de Saúde' },
        ].map(({ icon: Icon, color, bg, value, label }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-3 md:p-5 flex flex-col items-center gap-1.5">
            <div className={cn('size-8 md:size-10 rounded-lg flex items-center justify-center', bg)}>
              <Icon className={cn('size-4 md:size-5', color)} />
            </div>
            <span className="text-lg md:text-2xl font-bold tabular-nums">{value}</span>
            <span className="text-[10px] md:text-xs text-muted-foreground leading-tight text-center">{label}</span>
          </div>
        ))}
      </div>

      {/* ── AÇÕES RÁPIDAS (Client Component) ─────────── */}
      <AnimalQuickActions
        animalId={animal.id}
        farmId={farmId}
        animalTag={animal.tag}
        animalStatus={animal.status}
        animalSex={animal.sex}
        animalCategory={animal.category}
        animalBirthType={animal.birthType ?? null}
        currentLotId={animal.lotId}
        lots={lots}
        userRole={role}
      />

      {/* Seção: Identificação */}
      <SectionCard title="Identificação">
        <InfoRows>
          <InfoRow label="Brinco" value={<span className="font-mono text-primary font-bold">{animal.tag}</span>} highlight />
          {animal.birthDate && (
            <InfoRow
              label="Nascimento"
              value={`${formatDate(animal.birthDate)} · ${calculateAge(animal.birthDate)}`}
            />
          )}
          {animal.birthType && (
            <InfoRow label="Origem" value={BIRTH_TYPE_LABELS[animal.birthType] ?? animal.birthType} />
          )}
          {lastWeight && (
            <InfoRow
              label="Último peso"
              value={`${formatWeight(lastWeight.weightKg)} · ${formatDate(lastWeight.measuredAt)}`}
            />
          )}
          {animal.observations && (
            <InfoRow
              label="Observações"
              value={<span className="text-muted-foreground">{animal.observations}</span>}
            />
          )}
        </InfoRows>
      </SectionCard>

      {/* Seção: Linhagem */}
      {(animal.mother || animal.father) && (
        <SectionCard title="Linhagem">
          <InfoRows>
            {animal.mother && (
              <InfoRow
                label="Mãe"
                value={
                  <Link
                    href={`/animals/${animal.mother.id}`}
                    className="text-primary font-mono hover:underline"
                  >
                    {animal.mother.tag}
                    {animal.mother.name && ` · ${animal.mother.name}`}
                  </Link>
                }
              />
            )}
            {animal.father && (
              <InfoRow
                label="Pai"
                value={
                  <Link
                    href={`/animals/${animal.father.id}`}
                    className="text-primary font-mono hover:underline"
                  >
                    {animal.father.tag}
                    {animal.father.name && ` · ${animal.father.name}`}
                  </Link>
                }
              />
            )}
          </InfoRows>
        </SectionCard>
      )}

      {/* Seção: Crias */}
      {animal.maternalChildren.length > 0 && (
        <SectionCard
          title="Crias"
          subtitle={`${animal.maternalChildren.length} bezerro${animal.maternalChildren.length !== 1 ? 's' : ''}`}
        >
          <div className="space-y-1">
            {animal.maternalChildren.map((cria) => (
              <Link
                key={cria.id}
                href={`/animals/${cria.id}`}
                className="flex items-center justify-between py-1.5 rounded-lg hover:bg-muted/50 px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Baby className={cn(
                    'size-3.5 shrink-0',
                    cria.sex === 'FEMALE' ? 'text-pink-400' : 'text-sky-400',
                  )} />
                  <span className="font-mono text-sm font-semibold text-primary">{cria.tag}</span>
                  {cria.name && (
                    <span className="text-sm text-muted-foreground truncate">· {cria.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {cria.birthDate && (
                    <span className="text-xs text-muted-foreground">{formatDate(cria.birthDate)}</span>
                  )}
                  <CategoryBadge category={cria.category} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Produção de Leite (vacas e novilhas fêmeas com participações) */}
      {animal.sex === 'FEMALE' && milkStats.participationCount > 0 && (
        <SectionCard
          title="Produção de Leite"
          subtitle="Estimativas por distribuição de ordenha"
          action={
            <Link href={`/milk/${id}`} className="text-xs text-primary hover:underline">
              Ver histórico
            </Link>
          }
        >
          <InfoRows>
            <InfoRow
              label="Vitalícia"
              value={<span className="text-cyan-400 font-bold tabular-nums">{formatLiters(milkStats.totalLifetime)}</span>}
              highlight
            />
            <InfoRow label="Ano atual"       value={<span className="tabular-nums">{formatLiters(milkStats.totalCurrentYear)}</span>} />
            <InfoRow label="Últimos 30 dias" value={<span className="tabular-nums">{formatLiters(milkStats.totalLast30Days)}</span>} />
            <InfoRow label="Participações"   value={`${milkStats.participationCount} ordenhas`} />
          </InfoRows>
        </SectionCard>
      )}

      {/* Reprodução (se houver) */}
      {animal.reproductions.length > 0 && (
        <SectionCard
          title="Reprodução"
          subtitle={`${animal.reproductions.length} registros`}
          action={
            <Link href={`/animals/${id}/reproduction`} className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          }
        >
          <InfoRows>
            {animal.reproductions.slice(0, 2).map((r) => (
              <InfoRow
                key={r.id}
                label={formatDate(r.date)}
                value={
                  <span className="text-muted-foreground">
                    {r.bullName ?? 'Não informado'} · {r.status}
                  </span>
                }
              />
            ))}
          </InfoRows>
        </SectionCard>
      )}

      {/* Dados Veterinários */}
      {vetSnapshot && (
        <SectionCard
          title="Dados Veterinários"
          action={
            <Link href="/veterinary" className="text-xs text-primary hover:underline flex items-center gap-1">
              <Stethoscope className="size-3" />
              Dashboard
            </Link>
          }
        >
          <div className="space-y-3">
            {/* Grupo + data do relatório */}
            <div className="flex items-center gap-2 flex-wrap">
              <VeterinaryGroupBadge group={vetSnapshot.reportGroup} />
              <span className="text-xs text-muted-foreground">
                {vetSnapshot.report?.reportDate
                  ? formatDate(vetSnapshot.report.reportDate)
                  : formatDate(vetSnapshot.createdAt)}
              </span>
              {vetSnapshot.report?.sourceSystem && (
                <span className="text-xs text-muted-foreground">
                  · {REPORT_SOURCE_LABELS[vetSnapshot.report.sourceSystem as keyof typeof REPORT_SOURCE_LABELS] ?? vetSnapshot.report.sourceSystem}
                </span>
              )}
            </div>

            {/* Métricas */}
            <InfoRows>
              {vetSnapshot.parityNumber != null && (
                <InfoRow label="Partos (NP)" value={String(vetSnapshot.parityNumber)} />
              )}
              {vetSnapshot.lastCalvingDate && (
                <InfoRow label="Último parto"   value={formatDate(vetSnapshot.lastCalvingDate)} />
              )}
              {vetSnapshot.expectedCalvingDate && (
                <InfoRow label="Parto previsto" value={formatDate(vetSnapshot.expectedCalvingDate)} />
              )}
              {vetSnapshot.inseminationDate && (
                <InfoRow label="Última IA"      value={formatDate(vetSnapshot.inseminationDate)} />
              )}
              {vetSnapshot.bullName && (
                <InfoRow label="Touro"          value={vetSnapshot.bullName} />
              )}
              {vetSnapshot.ccsThousand != null && (
                <InfoRow
                  label="CCS (×1000)"
                  value={
                    <span className={vetSnapshot.ccsThousand >= 400 ? 'text-red-500 font-semibold' : ''}>
                      {vetSnapshot.ccsThousand.toLocaleString('pt-BR')}
                    </span>
                  }
                />
              )}
              {vetSnapshot.mastitisDays != null && vetSnapshot.mastitisDays > 0 && (
                <InfoRow
                  label="Mamite"
                  value={
                    <span className="text-red-500 font-semibold">
                      {vetSnapshot.mastitisDays} dia{vetSnapshot.mastitisDays !== 1 ? 's' : ''}
                    </span>
                  }
                />
              )}
              {vetSnapshot.discardRecommendation && (
                <InfoRow
                  label="Descarte"
                  value={<span className="text-destructive font-semibold">Recomendado</span>}
                />
              )}
              {vetSnapshot.occurrence && (
                <InfoRow label="Ocorrência" value={vetSnapshot.occurrence} />
              )}
            </InfoRows>

            {/* Histórico resumido */}
            {vetHistory.length > 1 && (
              <div className="pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground mb-1.5">Histórico veterinário</p>
                <div className="space-y-1.5">
                  {vetHistory.map((h, i) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground whitespace-nowrap w-20 shrink-0">
                        {h.report?.reportDate
                          ? formatDate(h.report.reportDate)
                          : formatDate(h.createdAt)}
                      </span>
                      <VeterinaryGroupBadge group={h.reportGroup} size="sm" />
                      {i === 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 shrink-0">
                          Atual
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Nutrição */}
      <SectionCard
        title="Nutrição"
        subtitle={animal.totalFeedConsumedKg > 0 ? `${animal.totalFeedConsumedKg.toFixed(1)} kg acumulado` : undefined}
        action={
          <Link href="/feed/new" className="text-xs text-primary hover:underline flex items-center gap-1">
            <Wheat className="size-3" />
            Registrar
          </Link>
        }
        noPadding
      >
        <div className="p-4">
          <AnimalFeedSection
            totalFeedConsumedKg={animal.totalFeedConsumedKg}
            estimatedFeedCost={animal.estimatedFeedCost}
            recentHistory={feedHistory}
          />
        </div>
      </SectionCard>

      {/* Saúde */}
      <SectionCard title="Eventos de Saúde" noPadding>
        <div className="p-4">
          <HealthEventTimeline
            events={healthEvents}
            animalId={animal.id}
            farmId={farmId}
            userId={session.user.id}
          />
        </div>
      </SectionCard>

      {/* Histórico de auditoria (OWNER / MANAGER) */}
      {canViewAudit && (
        <SectionCard
          title="Histórico"
          subtitle={auditHistory.length > 0 ? `${auditHistory.length} registro${auditHistory.length !== 1 ? 's' : ''}` : undefined}
          action={
            <Link href={`/audit?entity=Animal`} className="text-xs text-primary hover:underline flex items-center gap-1">
              <ClipboardList className="size-3" />
              Ver auditoria
            </Link>
          }
          noPadding
        >
          <div className="px-4 pb-2">
            <AuditTimeline logs={auditHistory} showUser={['OWNER', 'MANAGER'].includes(role)} />
          </div>
        </SectionCard>
      )}

      {/* Timeline de fotos */}
      <SectionCard
        title="Linha do Tempo"
        subtitle={`${animal._count.photos} foto${animal._count.photos !== 1 ? 's' : ''}`}
        action={
          isActive ? (
            <AddPhotoButton
              animalId={animal.id}
              farmId={farmId}
              className="text-xs text-primary hover:underline"
            />
          ) : undefined
        }
        noPadding
      >
        <div className="p-4">
          <AnimalTimeline
            photos={animal.photos}
            context={{
              category: animal.category,
              sex:      animal.sex,
              lotName:  animal.lot?.name ?? null,
            }}
            animalTag={animal.tag}
            farmId={farmId}
            canDelete={['OWNER', 'MANAGER'].includes(role)}
          />
        </div>
      </SectionCard>

    </div>
  )
}
