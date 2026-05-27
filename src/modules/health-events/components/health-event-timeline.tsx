/**
 * Timeline de saúde do animal — Server Component.
 * Renderiza lista cronológica de eventos de saúde.
 */

import { HealthEventCard }  from './health-event-card'
import { canAccess }        from '@/lib/permissions'
import type { HealthEventItem } from '../types'
import { Activity }         from 'lucide-react'
import Link                 from 'next/link'

interface Props {
  events:   HealthEventItem[]
  animalId: string
  farmId:   string
  userId:   string
}

export async function HealthEventTimeline({
  events,
  animalId,
  farmId,
  userId,
}: Props) {
  const canManage = await canAccess(userId, farmId, 'WORKER')

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          Saúde ({events.length})
        </h2>
        <Link
          href={`/health-events/new?animalId=${animalId}`}
          className="text-xs text-primary hover:underline"
        >
          + Registrar
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Nenhum evento de saúde registrado.
        </p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <HealthEventCard
              key={event.id}
              event={event}
              farmId={farmId}
              canManage={canManage}
              showAnimal={false}
            />
          ))}
        </div>
      )}
    </section>
  )
}
