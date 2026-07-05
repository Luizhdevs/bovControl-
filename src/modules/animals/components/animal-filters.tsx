'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

// ─── Opções de filtro ──────────────────────────────────────

const SEX_OPTIONS = [
  { label: 'Todos',  value: '' },
  { label: 'Fêmea',  value: 'FEMALE' },
  { label: 'Macho',  value: 'MALE' },
]

const CATEGORY_OPTIONS = [
  { label: 'Todas',     value: '' },
  { label: 'Vaca',      value: 'COW' },
  { label: 'Novilha',   value: 'HEIFER' },
  { label: 'Bezerra',   value: 'CALF' },
  { label: 'Touro',     value: 'BULL' },
  { label: 'Boi',       value: 'STEER' },
]

const STATUS_OPTIONS = [
  { label: 'Ativas',       value: 'ACTIVE' },
  { label: 'Vendidas',     value: 'SOLD' },
  { label: 'Mortas',       value: 'DEAD' },
  { label: 'Transferidas', value: 'TRANSFERRED' },
]

// ─── Pill de filtro ────────────────────────────────────────

interface FilterPillProps {
  label:     string
  isActive:  boolean
  onClick:   () => void
  colorClass?: string
}

function FilterPill({ label, isActive, onClick, colorClass }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
        'border transition-all duration-150',
        'active:scale-95',
        // Área mínima de toque
        'min-h-[36px]',
        isActive
          ? cn('border-primary bg-primary text-primary-foreground', colorClass)
          : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

// ─── Grupo de filtro ───────────────────────────────────────

interface FilterGroupProps {
  label:   string
  options: { label: string; value: string }[]
  param:   string
  current: string
  onFilter: (param: string, value: string) => void
}

function FilterGroup({ label, options, param, current, onFilter }: FilterGroupProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground px-1">
        {label}
      </span>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {options.map((opt) => (
          <FilterPill
            key={opt.value}
            label={opt.label}
            isActive={current === opt.value}
            onClick={() => onFilter(param, opt.value)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────

interface LotOption {
  id:   string
  name: string
}

export function AnimalFilters({ lots = [] }: { lots?: LotOption[] }) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Lê os filtros atuais dos search params
  const search   = params.get('search')   ?? ''
  const sex      = params.get('sex')      ?? ''
  const category = params.get('category') ?? ''
  const status   = params.get('status')   ?? 'ACTIVE'
  const lotId    = params.get('lotId')    ?? ''

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())

      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }

      // Reseta para página 1 ao filtrar
      next.delete('page')

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
      {/* Campo de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
        <Input
          placeholder="Buscar por brinco ou nome..."
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 h-11 text-base"
          // Evita zoom no iOS ao focar
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Filtros em pills */}
      <div className="space-y-3">
        <FilterGroup
          label="Sexo"
          options={SEX_OPTIONS}
          param="sex"
          current={sex}
          onFilter={updateFilter}
        />
        <FilterGroup
          label="Categoria"
          options={CATEGORY_OPTIONS}
          param="category"
          current={category}
          onFilter={updateFilter}
        />
        <FilterGroup
          label="Status"
          options={STATUS_OPTIONS}
          param="status"
          current={status}
          onFilter={updateFilter}
        />
        {lots.length > 0 && (
          <FilterGroup
            label="Lote"
            options={[
              { label: 'Todos', value: '' },
              { label: 'Sem lote', value: 'none' },
              ...lots.map(l => ({ label: l.name, value: l.id })),
            ]}
            param="lotId"
            current={lotId}
            onFilter={updateFilter}
          />
        )}
      </div>
    </div>
  )
}
