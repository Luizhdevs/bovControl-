'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  REPRODUCTION_TYPE_LABELS,
  REPRODUCTION_STATUS_LABELS,
} from '@/modules/shared/domain/animal-labels'

// ─── Opções ────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: '7d',  value: '7'  },
  { label: '30d', value: '30' },
  { label: '90d', value: '90' },
]

const TYPE_OPTIONS = [
  { label: 'Todos',  value: '' },
  { label: REPRODUCTION_TYPE_LABELS['INSEMINATION']!,    value: 'INSEMINATION'    },
  { label: REPRODUCTION_TYPE_LABELS['NATURAL_MATING']!,  value: 'NATURAL_MATING'  },
  { label: REPRODUCTION_TYPE_LABELS['PREGNANCY_CHECK']!, value: 'PREGNANCY_CHECK' },
]

const STATUS_OPTIONS = [
  { label: 'Todos',  value: '' },
  { label: REPRODUCTION_STATUS_LABELS['PENDING']!,   value: 'PENDING'   },
  { label: REPRODUCTION_STATUS_LABELS['CONFIRMED']!, value: 'CONFIRMED' },
  { label: REPRODUCTION_STATUS_LABELS['FAILED']!,    value: 'FAILED'    },
]

// ─── Componente ────────────────────────────────────────────

interface ReproductionFiltersProps {
  currentDays?:   number
  currentType?:   string
  currentStatus?: string
}

export function ReproductionFilters({
  currentDays   = 30,
  currentType   = '',
  currentStatus = '',
}: ReproductionFiltersProps) {
  const router      = useRouter()
  const searchParams = useSearchParams()

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      router.replace(`?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <div className="space-y-3">
      {/* Período */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Período</p>
        <div className="flex gap-1.5 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams('days', opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px]',
                String(currentDays) === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo de evento */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Tipo</p>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams('type', opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px]',
                currentType === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5 font-medium">Status</p>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParams('status', opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px]',
                currentStatus === opt.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
