'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback }    from 'react'
import { MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'
import { cn } from '@/lib/utils'

// ─── Opções ────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: '7 dias',  value: '7'  },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
]

const SHIFT_OPTIONS = [
  { label: 'Todos',                          value: ''          },
  { label: MILK_SHIFT_LABELS['MORNING']!,    value: 'MORNING'   },
  { label: MILK_SHIFT_LABELS['AFTERNOON']!,  value: 'AFTERNOON' },
]

// ─── Componente ────────────────────────────────────────────

export function MilkFilters() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const days  = searchParams.get('days')  ?? '30'
  const shift = searchParams.get('shift') ?? ''

  // Pills usam navegação imediata — debounce é para text inputs, não buttons
  const updateParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.replace(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  return (
    <div className="space-y-3">
      {/* Período */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Período</p>
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParams('days', opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border active:scale-95',
                days === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Turno */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Turno</p>
        <div className="flex gap-2 flex-wrap">
          {SHIFT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateParams('shift', opt.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all border active:scale-95',
                shift === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border/80',
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
