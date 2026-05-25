import { notFound, redirect } from 'next/navigation'
import { auth }                from '@/lib/auth'
import { prisma }              from '@/lib/prisma'

import { getLotById, getAnimalsAvailableForLot } from '@/modules/lots/queries'
import { LotAnimalsList }      from '@/modules/lots/components/lot-animals-list'
import { LotPageActions }      from '@/modules/lots/components/lot-page-actions'
import { LotCapacityIndicator } from '@/modules/lots/components/lot-capacity-indicator'
import { PageHeader }          from '@/components/shared/page-header'
import { SectionCard, InfoRow, InfoRows } from '@/components/shared/section-card'
import { LotTypeBadge }        from '@/components/shared/status-badge'

// ─── Metadata dinâmica ─────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session) return {}

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) return {}

  const lot = await getLotById(id, farmUser.farmId)
  if (!lot) return { title: 'Lote | BovControl' }

  return { title: `${lot.name} | BovControl` }
}

// ─── Page ──────────────────────────────────────────────────

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true, role: true },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId, role } = farmUser

  // Carrega dados em paralelo
  const [lot, availableAnimals] = await Promise.all([
    getLotById(id, farmId),
    getAnimalsAvailableForLot(farmId, id),
  ])

  if (!lot) notFound()

  const { stats } = lot

  // Distribui as colunas de stats de acordo com o tipo do lote
  const statItems = [
    { label: 'Total',    value: stats.total,   color: 'text-foreground' },
    { label: 'Fêmeas',   value: stats.females, color: 'text-pink-400'   },
    { label: 'Machos',   value: stats.males,   color: 'text-sky-400'    },
    { label: 'Vacas',    value: stats.cows,    color: 'text-purple-400' },
    { label: 'Novilhas', value: stats.heifers, color: 'text-blue-400'   },
    { label: 'Bezerros', value: stats.calves,  color: 'text-green-400'  },
    { label: 'Touros',   value: stats.bulls,   color: 'text-red-400'    },
    { label: 'Bois',     value: stats.steers,  color: 'text-amber-400'  },
  ].filter((item) => item.value > 0 || item.label === 'Total')

  return (
    // pb-40 para a barra fixa do rodapé não cobrir o conteúdo
    <div className="space-y-4 pb-40">

      {/* Header */}
      <PageHeader
        backHref="/lots"
        title={lot.name}
        description={lot.pasture?.name}
        actions={<LotTypeBadge type={lot.type} size="md" />}
      />

      {/* Indicador de capacidade em destaque */}
      <SectionCard title="Ocupação">
        <LotCapacityIndicator
          count={stats.total}
          maxCapacity={lot.maxCapacity}
          className="py-1"
        />
      </SectionCard>

      {/* Grid de estatísticas */}
      <div className="grid grid-cols-4 gap-2">
        {statItems.slice(0, 4).map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card p-3 text-center"
          >
            <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
            <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Segunda linha de stats (apenas as que têm valor) */}
      {statItems.length > 4 && (
        <div className="grid grid-cols-4 gap-2">
          {statItems.slice(4).map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border bg-card p-3 text-center"
            >
              <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informações do lote */}
      <SectionCard title="Informações">
        <InfoRows>
          {lot.pasture && (
            <InfoRow
              label="Pasto"
              value={
                <span>
                  {lot.pasture.name}
                  {lot.pasture.areaHectares && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      · {lot.pasture.areaHectares} ha
                    </span>
                  )}
                  {lot.pasture.grassType && (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      · {lot.pasture.grassType}
                    </span>
                  )}
                </span>
              }
            />
          )}
          {lot.maxCapacity && (
            <InfoRow
              label="Capacidade"
              value={`${lot.maxCapacity} animais`}
            />
          )}
          {lot.observations && (
            <InfoRow
              label="Observações"
              value={
                <span className="text-muted-foreground">{lot.observations}</span>
              }
            />
          )}
        </InfoRows>
      </SectionCard>

      {/* Lista de animais */}
      <SectionCard
        title="Animais"
        subtitle={`${stats.total} ativo${stats.total !== 1 ? 's' : ''}`}
        noPadding
      >
        <div className="p-4">
          <LotAnimalsList
            animals={lot.animals}
            farmId={farmId}
            lotId={lot.id}
          />
        </div>
      </SectionCard>

      {/* Ações interativas (Client Component) */}
      <LotPageActions
        lot={lot}
        farmId={farmId}
        availableAnimals={availableAnimals}
        userRole={role}
      />

    </div>
  )
}
