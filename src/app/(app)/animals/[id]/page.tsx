import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { getActiveFarm } from '@/lib/active-farm'

import { getAnimalById, getLotsForSelect }         from '@/modules/animals/queries'
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
import { PageHeader }          from '@/components/shared/page-header'
import { SexBadge, CategoryBadge, PurposeBadge, AnimalStatusBadge, InseminationBadge } from '@/components/shared/status-badge'

import {
  cn,
  formatDate,
  formatWeight,
  formatLiters,
  calculateAge,
  BIRTH_TYPE_LABELS,
  LOT_TYPE_LABELS,
} from '@/lib/utils'
import { Scale, MilkIcon, Heart, Camera, Wheat, ClipboardList } from 'lucide-react'

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
  const [animal, lots, healthEvents, feedHistory, milkStats, auditHistory] = await Promise.all([
    getAnimalById(id, farmId),
    getLotsForSelect(farmId),
    getHealthEventsByAnimal(id, farmId, 10),
    getAnimalFeedHistory(id, farmId, 5),
    getAnimalMilkStats(id, farmId),
    canViewAudit ? getEntityHistory(id, farmId, 20) : Promise.resolve([]),
  ])

  if (!animal) notFound()

  const primaryPhoto = animal.photos.find((p) => p.isPrimary)
  const lastWeight   = animal.weightRecords[0]
  const isActive     = animal.status === 'ACTIVE'

  return (
    // Espaçamento inferior para a barra fixa do rodapé
    <div className={cn('space-y-4', isActive ? 'pb-40' : 'pb-6')}>

      {/* Header */}
      <PageHeader
        backHref="/animals"
        title={animal.tag}
        description={animal.name ?? undefined}
      />

      {/* Foto de capa */}
      {primaryPhoto ? (
        <div className="relative h-56 -mx-4 overflow-hidden bg-muted">
          <Image
            src={primaryPhoto.url}
            alt={`Foto de ${animal.tag}`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          {/* Tag sobreposta na foto */}
          <div className="absolute bottom-3 left-4">
            <span className="font-mono text-xl font-bold text-white drop-shadow">
              {animal.tag}
            </span>
            {animal.name && (
              <span className="ml-2 text-white/80 text-sm drop-shadow">
                {animal.name}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-24 -mx-4 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
          <span className="text-4xl font-bold text-muted-foreground/20 font-mono">
            {animal.name?.[0] ?? animal.tag.slice(-2)}
          </span>
        </div>
      )}

      {/* Badges de identificação */}
      <div className="flex flex-wrap gap-2">
        <SexBadge sex={animal.sex} size="lg" />
        <CategoryBadge category={animal.category} size="lg" />
        <PurposeBadge purpose={animal.purpose} size="lg" />
        <AnimalStatusBadge status={animal.status} size="lg" />
        {animal.birthType === 'INSEMINATION' && (
          <InseminationBadge size="lg" />
        )}
      </div>

      {/* Ações rápidas (Client Component) */}
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
          <InfoRow label="Brinco" value={<span className="font-mono">{animal.tag}</span>} highlight />
          <InfoRow label="Raça"   value={animal.breed} />
          {animal.birthDate && (
            <InfoRow
              label="Nascimento"
              value={`${formatDate(animal.birthDate)} · ${calculateAge(animal.birthDate)}`}
            />
          )}
          {animal.birthType && (
            <InfoRow label="Origem" value={BIRTH_TYPE_LABELS[animal.birthType] ?? animal.birthType} />
          )}
          {animal.lot && (
            <InfoRow
              label="Lote atual"
              value={
                <span>
                  {animal.lot.name}
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    · {LOT_TYPE_LABELS[animal.lot.type]}
                  </span>
                </span>
              }
            />
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

      {/* Seção: Contadores */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <MilkIcon className="size-5 text-cyan-400 mx-auto mb-1" />
          <div className="text-xl font-bold">{animal._count.milkRecords}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Registros de leite</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Scale className="size-5 text-blue-400 mx-auto mb-1" />
          <div className="text-xl font-bold">{animal.weightRecords.length}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Pesagens</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <Heart className="size-5 text-red-400 mx-auto mb-1" />
          <div className="text-xl font-bold">{animal._count.healthEvents}</div>
          <div className="text-[11px] text-muted-foreground leading-tight">Eventos saúde</div>
        </div>
      </div>

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
