'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition }               from 'react'
import { Input }                                    from '@/components/ui/input'
import { cn }                                        from '@/lib/utils'
import { Search, Loader2 }                           from 'lucide-react'
import { useDebounce }                               from '@/hooks/use-debounce'
import { LOT_TYPE_LABELS }                           from '@/modules/shared/domain/animal-labels'

// ─── Opções de filtro ──────────────────────────────────────

const TYPE_OPTIONS = [
  { label: 'Todos',     value: '' },
  { label: 'Lactação',  value: 'LACTATING' },
  { label: 'Seco',      value: 'DRY'       },
  { label: 'Novilhas',  value: 'HEIFER'    },
  { label: 'Bezerros',  value: 'CALF'      },
  { label: 'Engorda',   value: 'FATTENING' },
  { label: 'Misto',     value: 'MIXED'     },
]

// ─── Pill de filtro ────────────────────────────────────────

function FilterPill({
  label,
  isActive,
  onClick,
}: {
  label:    string
  isActive: boolean
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
        'border transition-all duration-150 active:scale-95',
        'min-h-[36px]',
        isActive
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Filtros de lotes — padrão URL-based com debounce.
 * Mantém consistência com AnimalFilters (mesmo padrão de useSearchParams + replace).
 */
export function LotFilters() {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const search = params.get('search') ?? ''
  const type   = params.get('type')   ?? ''

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`)
      })
    },
    [params, pathname, router],
  )

  const handleSearch = useDebounce((value: string) => {
    updateFilter('search', value)
  }, 400)

  return (
    <div className="space-y-3">
      {/* Busca por nome */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
        <Input
          placeholder="Buscar por nome do lote..."
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-11 text-base"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Filtro por tipo */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground px-1">Tipo</span>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TYPE_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.value}
              label={opt.label}
              isActive={type === opt.value}
              onClick={() => updateFilter('type', opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
