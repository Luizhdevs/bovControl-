import { notFound, redirect } from 'next/navigation'
import Link   from 'next/link'
import { auth }   from '@/lib/auth'
import { prisma } from '@/lib/prisma'

import { getMilkRecordsByAnimal } from '@/modules/milk/queries'
import { MilkRecordCard }    from '@/modules/milk/components/milk-record-card'
import { PageHeader }        from '@/components/shared/page-header'
import { SectionCard }       from '@/components/shared/section-card'
import { EmptyState }        from '@/components/shared/empty-state'
import { formatLiters }      from '@/lib/utils'
import { getCategoryLabel }  from '@/modules/shared/domain/animal-labels'
import { MilkIcon, Plus }    from 'lucide-react'
import { Button }            from '@/components/ui/button'

// ─── Metadata dinâmica ─────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ animalId: string }>
}) {
  const { animalId } = await params
  const session = await auth()
  if (!session) return {}

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) return {}

  const animal = await prisma.animal.findFirst({
    where:  { id: animalId, farmId: farmUser.farmId },
    select: { tag: true, name: true },
  })

  if (!animal) return { title: 'Leite | BovControl' }
  const display = animal.name ? `${animal.tag} · ${animal.name}` : animal.tag
  return { title: `Leite — ${display} | BovControl` }
}

// ─── Page ──────────────────────────────────────────────────

export default async function MilkAnimalPage({
  params,
}: {
  params: Promise<{ animalId: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { animalId } = await params

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true, role: true },
  })
  if (!farmUser) redirect('/onboarding')

  const { farmId, role } = farmUser
  const canDelete = ['OWNER', 'MANAGER'].includes(role)

  const [animal, records] = await Promise.all([
    prisma.animal.findFirst({
      where:  { id: animalId, farmId },
      select: {
        id:       true,
        tag:      true,
        name:     true,
        category: true,
        sex:      true,
        status:   true,
        lot:      { select: { id: true, name: true } },
      },
    }),
    getMilkRecordsByAnimal(animalId, farmId, 50),
  ])

  if (!animal) notFound()

  const totalLiters   = records.reduce((s, r) => s + r.liters, 0)
  const today         = new Date()
  const startOfDay    = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayLiters   = records
    .filter((r) => new Date(r.recordedAt) >= startOfDay)
    .reduce((s, r) => s + r.liters, 0)
  const avgPerRecord  = records.length > 0 ? totalLiters / records.length : 0

  const categoryLabel = getCategoryLabel(animal.category, animal.sex)
  const isActive      = animal.status === 'ACTIVE'

  return (
    <div className="space-y-4 pb-8">
      <PageHeader
        backHref="/milk"
        title={animal.name ?? animal.tag}
        description={`${animal.tag} · ${categoryLabel}${animal.lot ? ` · ${animal.lot.name}` : ''}`}
      />

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-cyan-400 tabular-nums">
            {formatLiters(todayLiters)}
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Hoje</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-foreground tabular-nums">
            {formatLiters(avgPerRecord)}
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Média</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <div className="text-xl font-bold text-foreground tabular-nums">
            {records.length}
          </div>
          <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">Registros</div>
        </div>
      </div>

      {/* Ação: registrar — navega ao /milk/new com animal pré-selecionado */}
      {isActive && (
        <Button asChild className="w-full h-12 gap-2">
          <Link href={`/milk/new?animalId=${animal.id}`}>
            <Plus className="size-4" />
            Registrar Produção
          </Link>
        </Button>
      )}

      {/* Lista de registros */}
      <SectionCard
        title="Registros"
        subtitle={`${formatLiters(totalLiters)} total · ${records.length} ordenhas`}
        noPadding
      >
        {records.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<MilkIcon />}
              title="Sem registros"
              description="Nenhuma produção registrada para este animal ainda."
            />
          </div>
        ) : (
          <div className="px-4 divide-y divide-border/40">
            {records.map((record) => (
              <MilkRecordCard
                key={record.id}
                record={record}
                farmId={farmId}
                showAnimal={false}
                canDelete={canDelete}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
