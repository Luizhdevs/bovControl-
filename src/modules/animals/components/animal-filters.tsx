'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Search, Loader2, SlidersHorizontal, X } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

// ─── Opções ────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'Ativas',       value: 'ACTIVE'      },
  { label: 'Vendidas',     value: 'SOLD'        },
  { label: 'Mortas',       value: 'DEAD'        },
  { label: 'Transferidas', value: 'TRANSFERRED' },
  { label: 'Todas',        value: 'ALL'         },
]

const SEX_OPTIONS = [
  { label: 'Fêmea', value: 'FEMALE' },
  { label: 'Macho', value: 'MALE'   },
]

const CATEGORY_OPTIONS = [
  { label: 'Vaca',    value: 'COW'    },
  { label: 'Novilha', value: 'HEIFER' },
  { label: 'Bezerro', value: 'CALF'   },
  { label: 'Touro',   value: 'BULL'   },
  { label: 'Boi',     value: 'STEER'  },
]

const AGE_OPTIONS = [
  { label: 'Até 30 dias',    value: '0-30'    },
  { label: '1 – 3 meses',    value: '30-90'   },
  { label: '3 – 6 meses',    value: '90-180'  },
  { label: '6 – 12 meses',   value: '180-365' },
  { label: '1 – 2 anos',     value: '365-730' },
  { label: 'Mais de 2 anos', value: '730+'    },
]

// ─── Helpers ───────────────────────────────────────────────

interface LotOption     { id: string; name: string }
interface PastureOption { id: string; name: string }

// Conta quantos filtros estão ativos (excluindo busca e status=ACTIVE padrão)
function countActiveFilters(params: URLSearchParams): number {
  let n = 0
  if (params.get('sex'))       n++
  if (params.get('category'))  n++
  if (params.get('agePreset')) n++
  if (params.get('lotId'))     n++
  if (params.get('pastureId')) n++
  const s = params.get('status')
  if (s && s !== 'ACTIVE') n++
  return n
}

// ─── Chip de seleção ───────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
}: {
  label:   string
  active:  boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg px-3 py-2 text-sm font-medium border transition-all active:scale-95',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {label}
    </button>
  )
}

// ─── Grupo de filtro ───────────────────────────────────────

function FilterSection({
  title,
  children,
}: {
  title:    string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────

export function AnimalFilters({
  lots     = [],
  pastures = [],
}: {
  lots?:     LotOption[]
  pastures?: PastureOption[]
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const search    = params.get('search')    ?? ''
  const sex       = params.get('sex')       ?? ''
  const category  = params.get('category')  ?? ''
  const status    = params.get('status')    ?? 'ACTIVE'
  const lotId     = params.get('lotId')     ?? ''
  const pastureId = params.get('pastureId') ?? ''
  const agePreset = params.get('agePreset') ?? ''

  const activeCount = countActiveFilters(params)

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('page')
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`)
      })
    },
    [params, pathname, router],
  )

  // Toggle: se já está ativo, limpa; senão aplica
  const toggleFilter = useCallback(
    (key: string, value: string, current: string) => {
      updateFilter(key, current === value ? '' : value)
    },
    [updateFilter],
  )

  const clearAll = useCallback(() => {
    const next = new URLSearchParams()
    const s = params.get('search')
    if (s) next.set('search', s)
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`)
    })
    setOpen(false)
  }, [params, pathname, router])

  const handleSearch = useDebounce((value: string) => {
    updateFilter('search', value)
  }, 400)

  return (
    <>
      {/* Barra de busca + botão de filtro */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          {isPending && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
          )}
          <Input
            placeholder="Buscar por brinco ou nome…"
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11 text-base"
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* Botão de filtro */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'relative h-11 w-11 shrink-0 rounded-lg border flex items-center justify-center transition-colors',
            activeCount > 0
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Sheet de filtros */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto pb-8">
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle>Filtros</SheetTitle>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="size-3.5" />
                  Limpar todos
                </button>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-6">

            {/* Status */}
            <FilterSection title="Status">
              {STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={status === opt.value}
                  onClick={() => updateFilter('status', opt.value)}
                />
              ))}
            </FilterSection>

            {/* Categoria */}
            <FilterSection title="Categoria">
              {CATEGORY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={category === opt.value}
                  onClick={() => toggleFilter('category', opt.value, category)}
                />
              ))}
            </FilterSection>

            {/* Sexo */}
            <FilterSection title="Sexo">
              {SEX_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={sex === opt.value}
                  onClick={() => toggleFilter('sex', opt.value, sex)}
                />
              ))}
            </FilterSection>

            {/* Idade */}
            <FilterSection title="Idade">
              {AGE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={agePreset === opt.value}
                  onClick={() => toggleFilter('agePreset', opt.value, agePreset)}
                />
              ))}
            </FilterSection>

            {/* Lote */}
            {lots.length > 0 && (
              <FilterSection title="Lote">
                <Chip
                  label="Sem lote"
                  active={lotId === 'none'}
                  onClick={() => toggleFilter('lotId', 'none', lotId)}
                />
                {lots.map((l) => (
                  <Chip
                    key={l.id}
                    label={l.name}
                    active={lotId === l.id}
                    onClick={() => toggleFilter('lotId', l.id, lotId)}
                  />
                ))}
              </FilterSection>
            )}

            {/* Pasto */}
            {pastures.length > 0 && (
              <FilterSection title="Pasto">
                <Chip
                  label="Sem pasto"
                  active={pastureId === 'none'}
                  onClick={() => toggleFilter('pastureId', 'none', pastureId)}
                />
                {pastures.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    active={pastureId === p.id}
                    onClick={() => toggleFilter('pastureId', p.id, pastureId)}
                  />
                ))}
              </FilterSection>
            )}

            <Button
              className="w-full h-12 text-base mt-2"
              onClick={() => setOpen(false)}
            >
              Ver resultados
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
