import { cn } from '@/lib/utils'
import { SectionCard } from '@/components/shared/section-card'
import { EmptyState } from '@/components/shared/empty-state'
import { ReproductionCard } from './reproduction-card'
import type { ReproductionWithAnimal } from '../types'

interface ReproductionTimelineProps {
  records:     ReproductionWithAnimal[]
  farmId:      string
  showAnimal?: boolean
  canDelete?:  boolean
  title?:      string
}

export function ReproductionTimeline({
  records,
  farmId,
  showAnimal = false,
  canDelete  = false,
  title      = 'Histórico Reprodutivo',
}: ReproductionTimelineProps) {
  return (
    <SectionCard
      title={title}
      subtitle={`${records.length} ${records.length === 1 ? 'evento' : 'eventos'}`}
      noPadding
    >
      {records.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<span className="text-2xl">🔬</span>}
            title="Sem registros"
            description="Nenhum evento reprodutivo registrado ainda."
          />
        </div>
      ) : (
        <div className={cn('px-4 divide-y divide-border/40')}>
          {records.map((record) => (
            <ReproductionCard
              key={record.id}
              record={record}
              farmId={farmId}
              showAnimal={showAnimal}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}
    </SectionCard>
  )
}
