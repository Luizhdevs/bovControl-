import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'

import { getAnimalById, getLotsForSelect }             from '@/modules/animals/queries'
import { getSnapshotHistoryForAnimalCard }             from '@/modules/veterinary/queries'
import { VeterinaryGroupBadge }                        from '@/modules/veterinary/components/veterinary-group-badge'
import { REPORT_SOURCE_LABELS, DAY_MEANING_LABELS }    from '@/modules/veterinary/constants'
import { getAnimalMilkStats }                      from '@/modules/milk/queries'
import { getHealthEventsByAnimal }                 from '@/modules/health-events/queries'
import { getAnimalFeedHistory }                    from '@/modules/feed/queries'
import { getEntityHistory }                        from '@/modules/audit/queries'
import { AuditTimeline }                           from '@/modules/audit/components/audit-timeline'
import { AnimalFeedSection }                       from '@/modules/feed/components/animal-feed-section'
import { HealthEventTimeline }                     from '@/modules/health-events/components/health-event-timeline'
import { AnimalQuickActions, AddPhotoButton }  from '@/modules/animals/components/animal-quick-actions'
import { AnimalNextActionsSection }            from '@/modules/animals/components/animal-next-actions'
import { ReactivateAnimalButton }              from '@/modules/animals/components/animal-status-actions'
import { AnimalTimeline }      from '@/modules/animals/components/animal-timeline'
import { SectionCard, InfoRow, InfoRows } from '@/components/shared/section-card'
import { CategoryBadge, InseminationBadge } from '@/components/shared/status-badge'
import {
  getAnimalOrigin,
  getAnimalCompletenessStatus,
  getNextActions,
  getVetStatusLabel,
  daysToCalving,
  ANIMAL_ORIGIN_LABELS,
  ANIMAL_ORIGIN_DESCRIPTIONS,
} from '@/modules/animals/helpers'

import {
  cn,
  formatDate,
  formatWeight,
  formatLiters,
  calculateAge,
  BIRTH_TYPE_LABELS,
  LOT_TYPE_LABELS,
} from '@/lib/utils'
import {
  Scale, Heart, Wheat, ClipboardList, Tag, Stethoscope,
  Baby, ChevronLeft, Droplets, CheckCircle2, AlertTriangle,
  Clock,
} from 'lucide-react'

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

  // ── Helpers de origem, completude e ações ──────────────
  const origin      = getAnimalOrigin(animal, !!vetSnapshot)
  const completeness = getAnimalCompletenessStatus(
    animal,
    animal._count.photos,
    animal.reproductions.length > 0,
  )
  const nextActions  = getNextActions(animal, vetSnapshot)

  // Data efetiva do último parto — usa as 3 fontes disponíveis:
  //   1. animal.lastCalvingDate (atualizado por registerCalving)
  //   2. vetSnapshot.lastCalvingDate (do relatório PRODAP)
  //   3. maternalChildren — filho mais recente (cobre casos de createAnimal + motherId)
  const mostRecentChildBirth = animal.maternalChildren
    .map(c => c.birthDate)
    .filter((d): d is Date => d != null)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null

  const effectiveLastCalving = (() => {
    const candidates = [
      animal.lastCalvingDate   ? new Date(animal.lastCalvingDate)          : null,
      vetSnapshot?.lastCalvingDate ? new Date(vetSnapshot.lastCalvingDate) : null,
      mostRecentChildBirth     ? new Date(mostRecentChildBirth)            : null,
    ].filter((d): d is Date => d != null)
    if (candidates.length === 0) return null
    return candidates.reduce((best, d) => d > best ? d : best)
  })()

  const effectiveParityNumber = Math.max(
    animal.parityNumber ?? 0,
    vetSnapshot?.parityNumber ?? 0,
    animal.maternalChildren.length,
  ) || null

  // calvingDays: suprime "Parto vencido" se qualquer fonte mostra parto recente
  const rawCalvingDays = vetSnapshot ? daysToCalving(vetSnapshot.expectedCalvingDate) : null
  const expectedCalvingMs = vetSnapshot?.expectedCalvingDate
    ? new Date(vetSnapshot.expectedCalvingDate).getTime()
    : null
  const hasCalvedSinceExpected =
    expectedCalvingMs != null &&
    effectiveLastCalving != null &&
    effectiveLastCalving.getTime() >= expectedCalvingMs - 14 * 24 * 60 * 60 * 1000
  const calvingDays = hasCalvedSinceExpected ? null : rawCalvingDays

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

          {/* Gradiente base → topo */}
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
                  animal.status === 'SOLD'        ? 'bg-amber-500/90 text-white'  :
                  animal.status === 'TRANSFERRED' ? 'bg-blue-500/90 text-white'   :
                                                    'bg-red-500/90 text-white',
                )}>
                  {animal.status === 'SOLD' ? 'Vendido' : animal.status === 'TRANSFERRED' ? 'Transferido' : 'Óbito'}
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
          { icon: Droplets, color: 'text-cyan-400',  bg: 'bg-cyan-500/10',  value: animal._count.milkRecords,      label: 'Registros de Leite' },
          { icon: Scale,    color: 'text-blue-400',  bg: 'bg-blue-500/10',  value: animal.weightRecords.length,    label: 'Pesagens' },
          { icon: Heart,    color: 'text-red-400',   bg: 'bg-red-500/10',   value: animal._count.healthEvents,     label: 'Eventos de Saúde' },
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

      {/* ── SITUAÇÃO NO REBANHO ──────────────────────── */}
      <SectionCard title="Situação no Rebanho">
        <InfoRows>
          {/* Status */}
          <InfoRow
            label="Status"
            value={
              <span className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : animal.status === 'SOLD'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : animal.status === 'TRANSFERRED'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400',
              )}>
                {isActive ? 'Ativo'
                  : animal.status === 'SOLD' ? 'Vendido'
                  : animal.status === 'TRANSFERRED' ? 'Transferido'
                  : 'Óbito'}
              </span>
            }
            highlight
          />

          {/* Origem do cadastro */}
          <InfoRow
            label="Origem"
            value={
              <span
                title={ANIMAL_ORIGIN_DESCRIPTIONS[origin]}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-0.5',
                  origin === 'VETERINARY_IMPORTED'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : origin === 'MIXED'
                    ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                    : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
                )}
              >
                {ANIMAL_ORIGIN_LABELS[origin]}
              </span>
            }
          />

          {/* Código veterinário externo */}
          {animal.externalCode && (
            <InfoRow
              label="Cód. veterinário"
              value={<span className="font-mono text-sm text-primary font-semibold">{animal.externalCode}</span>}
            />
          )}

          {/* Última avaliação veterinária */}
          {animal.lastVeterinaryReportAt && (
            <InfoRow
              label="Última avaliação vet."
              value={
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  <Stethoscope className="size-3.5" />
                  {formatDate(animal.lastVeterinaryReportAt)}
                </span>
              }
            />
          )}

          {/* Status de lactação */}
          {(animal.milkStatus === 'LACTATING' || animal.milkStatus === 'DRY' || animal.milkStatus === 'DRY_PREGNANT') && (
            <InfoRow
              label="Status de leite"
              value={
                <span className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5',
                  animal.milkStatus === 'LACTATING'    && 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                  animal.milkStatus === 'DRY'          && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                  animal.milkStatus === 'DRY_PREGNANT' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                )}>
                  {animal.milkStatus === 'LACTATING'    && <><Droplets className="size-3" /> Em lactação</>}
                  {animal.milkStatus === 'DRY'          && <><Droplets className="size-3" /> Seca</>}
                  {animal.milkStatus === 'DRY_PREGNANT' && <><Droplets className="size-3" /> Seca gestante</>}
                </span>
              }
            />
          )}

          {/* Lote */}
          <InfoRow
            label="Lote"
            value={
              animal.lot
                ? <span>{animal.lot.name} <span className="text-muted-foreground text-xs">· {LOT_TYPE_LABELS[animal.lot.type]}</span></span>
                : <span className="text-muted-foreground italic">Sem lote</span>
            }
          />

          {/* Fotos */}
          <InfoRow
            label="Fotos"
            value={
              animal._count.photos === 0
                ? <span className="text-muted-foreground italic">Nenhuma foto</span>
                : `${animal._count.photos} foto${animal._count.photos !== 1 ? 's' : ''}`
            }
          />

          {/* Data / motivo de saída — apenas para não-ativos */}
          {!isActive && animal.exitDate && (
            <InfoRow
              label="Data de saída"
              value={<span className="text-muted-foreground">{formatDate(animal.exitDate)}</span>}
            />
          )}
          {!isActive && animal.exitReason && (
            <InfoRow
              label="Motivo"
              value={<span className="text-muted-foreground">{animal.exitReason}</span>}
            />
          )}

          {/* Última atualização */}
          {animal.updatedAt && (
            <InfoRow
              label="Atualizado"
              value={<span className="text-muted-foreground">{formatDate(animal.updatedAt)}</span>}
            />
          )}
        </InfoRows>

        {/* Indicador de completude */}
        {completeness.isComplete ? (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-medium">Cadastro completo</span>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-border space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="font-medium">Cadastro incompleto</span>
            </div>
            <ul className="space-y-0.5 pl-6">
              {completeness.missing.map((item) => (
                <li key={item} className="text-xs text-muted-foreground list-disc">{item}</li>
              ))}
            </ul>
          </div>
        )}
        {/* Botão de reativação — apenas para não-ativos com permissão */}
        {!isActive && (
          <div className="mt-3 pt-3 border-t border-border">
            <ReactivateAnimalButton
              animalId={animal.id}
              animalStatus={animal.status as 'SOLD' | 'DEAD' | 'TRANSFERRED'}
              userRole={role}
            />
          </div>
        )}
      </SectionCard>

      {/* ── PRÓXIMAS AÇÕES ───────────────────────────── */}
      <AnimalNextActionsSection
        actions={nextActions}
        animalId={animal.id}
        animalTag={animal.tag}
        animalName={animal.name ?? null}
      />

      {/* ── FOTOS / LINHA DO TEMPO ───────────────────── */}
      <SectionCard
        title="Fotos"
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

      {/* ── IDENTIFICAÇÃO ────────────────────────────── */}
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
            <InfoRow label="Tipo de nascimento" value={BIRTH_TYPE_LABELS[animal.birthType] ?? animal.birthType} />
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

      {/* ── LINHAGEM ─────────────────────────────────── */}
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

      {/* ── CRIAS ────────────────────────────────────── */}
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

      {/* ── DADOS VETERINÁRIOS (melhorado) ───────────── */}
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
            {/* Grupo + status calculado + data */}
            <div className="flex items-center gap-2 flex-wrap">
              <VeterinaryGroupBadge group={vetSnapshot.reportGroup} />
              <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {getVetStatusLabel(vetSnapshot.reportGroup)}
              </span>
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

            {/* Dias para parto — destaque */}
            {calvingDays !== null && (
              <div className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                calvingDays < 0
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : calvingDays <= 15
                  ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                  : 'bg-muted text-muted-foreground',
              )}>
                <Clock className="size-4 shrink-0" />
                {calvingDays < 0
                  ? `Parto vencido há ${Math.abs(calvingDays)} dia${Math.abs(calvingDays) !== 1 ? 's' : ''}`
                  : calvingDays === 0
                  ? 'Parto previsto para hoje'
                  : `${calvingDays} dia${calvingDays !== 1 ? 's' : ''} para o parto`}
              </div>
            )}

            {/* Métricas */}
            <InfoRows>
              {effectiveParityNumber != null && (
                <InfoRow label="Partos (NP)" value={String(effectiveParityNumber)} />
              )}
              {effectiveLastCalving && (
                <InfoRow label="Último parto" value={formatDate(effectiveLastCalving)} />
              )}
              {vetSnapshot.expectedCalvingDate && (
                <InfoRow label="Parto previsto" value={formatDate(vetSnapshot.expectedCalvingDate)} />
              )}
              {vetSnapshot.inseminationDate && (
                <InfoRow label="Última IA"      value={formatDate(vetSnapshot.inseminationDate)} />
              )}
              {vetSnapshot.inseminationNumber != null && (
                <InfoRow
                  label="Nº da IA"
                  value={`${vetSnapshot.inseminationNumber}ª inseminação`}
                />
              )}
              {vetSnapshot.reportDays != null && vetSnapshot.dayMeaning && vetSnapshot.dayMeaning !== 'UNKNOWN' && (
                <InfoRow
                  label={DAY_MEANING_LABELS[vetSnapshot.dayMeaning]}
                  value={`${vetSnapshot.reportDays} dia${vetSnapshot.reportDays !== 1 ? 's' : ''}`}
                />
              )}
              {vetSnapshot.bullName && (
                <InfoRow label="Touro / Sêmen"  value={vetSnapshot.bullName} />
              )}
              {vetSnapshot.cScore != null && (
                <InfoRow label="Cond. corporal (C)" value={`${vetSnapshot.cScore.toFixed(1)}`} />
              )}
              {vetSnapshot.tScore != null && (
                <InfoRow label="Escore úbere (T)"   value={`${vetSnapshot.tScore.toFixed(1)}`} />
              )}
              {vetSnapshot.milkCurrent != null && vetSnapshot.milkCurrent > 0 && (
                <InfoRow label="Leite atual"    value={`${vetSnapshot.milkCurrent.toFixed(1)} L`} />
              )}
              {vetSnapshot.milkPeak != null && vetSnapshot.milkPeak > 0 && (
                <InfoRow label="Leite pico"     value={`${vetSnapshot.milkPeak.toFixed(1)} L`} />
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
                  value={
                    <span className="text-destructive font-semibold">
                      Recomendado — {vetSnapshot.discardRecommendation}
                    </span>
                  }
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

      {/* ── REPRODUÇÃO ───────────────────────────────── */}
      {animal.reproductions.length > 0 && (
        <SectionCard
          title="Reprodução"
          subtitle={`${animal.reproductions.length} registro${animal.reproductions.length !== 1 ? 's' : ''}`}
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

      {/* ── SAÚDE ────────────────────────────────────── */}
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

      {/* ── NUTRIÇÃO / LEITE ─────────────────────────── */}
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

      {/* ── HISTÓRICO ────────────────────────────────── */}
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

    </div>
  )
}
