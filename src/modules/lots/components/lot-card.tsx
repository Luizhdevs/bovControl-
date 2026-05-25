import Link  from 'next/link'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'
import { LotTypeBadge }         from '@/components/shared/status-badge'
import { LotCapacityIndicator } from './lot-capacity-indicator'
import type { LotListItem }       from '../types'

// ─── Cores de destaque por tipo de lote ───────────────────

const LOT_TYPE_ACCENT: Record<string, string> = {
  LACTATING: 'border-l-purple-500',
  DRY:       'border-l-slate-500',
  HEIFER:    'border-l-blue-500',
  CALF:      'border-l-green-500',
  FATTENING: 'border-l-orange-500',
  MIXED:     'border-l-border',
}

// ─── Componente ────────────────────────────────────────────

interface LotCardProps {
  lot: LotListItem
}

export function LotCard({ lot }: LotCardProps) {
  const { stats } = lot

  return (
    <Link
      href={`/lots/${lot.id}`}
      className={cn(
        'group flex flex-col rounded-xl border border-border bg-card',
        'border-l-2',
        LOT_TYPE_ACCENT[lot.type] ?? 'border-l-border',
        'transition-all duration-150',
        'active:scale-[0.98] hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        'p-4 gap-3',
        // Área mínima de toque mobile
        'min-h-[120px]',
      )}
    >
      {/* Linha superior: nome + badge de tipo */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground truncate leading-tight">
            {lot.name}
          </h3>
          {lot.pasture && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="size-3 text-muted-foreground/60 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {lot.pasture.name}
              </span>
            </div>
          )}
        </div>
        <LotTypeBadge type={lot.type} size="sm" />
      </div>

      {/* Indicador de capacidade */}
      <LotCapacityIndicator
        count={stats.total}
        maxCapacity={lot.maxCapacity}
      />

      {/* Linha inferior: distribuição do rebanho */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {stats.total === 0 ? (
          <span className="italic">Lote vazio</span>
        ) : (
          <>
            {/* Total */}
            <span className="font-medium text-foreground">{stats.total}</span>

            {/* Vacas (se houver) */}
            {stats.cows > 0 && (
              <span>
                <span className="text-purple-400 font-medium">{stats.cows}</span>
                {' '}vaca{stats.cows !== 1 ? 's' : ''}
              </span>
            )}

            {/* Novilhas (se houver) */}
            {stats.heifers > 0 && (
              <span>
                <span className="text-blue-400 font-medium">{stats.heifers}</span>
                {' '}novilha{stats.heifers !== 1 ? 's' : ''}
              </span>
            )}

            {/* Bezerros (se houver) */}
            {stats.calves > 0 && (
              <span>
                <span className="text-green-400 font-medium">{stats.calves}</span>
                {' '}bezerro{stats.calves !== 1 ? 's' : ''}
              </span>
            )}

            {/* Machos (touros + bois) */}
            {stats.males > 0 && (stats.bulls > 0 || stats.steers > 0) && (
              <span className="text-sky-400 font-medium">
                {stats.males}♂
              </span>
            )}
          </>
        )}
      </div>
    </Link>
  )
}
