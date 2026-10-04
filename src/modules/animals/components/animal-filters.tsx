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

type LocalFilters = {
  status:    string[]   // vazio = ALL (sem filtro de status)
  category:  string[]
  sex:       string[]
  agePreset: string[]
  lotId:     string[]
  pastureId: string[]
}

function parseParam(val: string | null): string[] {
  if (!val || val === 'ACTIVE') return val === 'ACTIVE' ? ['ACTIVE'] : []
  return val.split(',').map(s => s.trim()).filter(Boolean)
}

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

  // Estado local da sheet — só navega ao clicar "Ver resultados"
  const [local, setLocal] = useState<LocalFilters>({
    status:    ['ACTIVE'],
    category:  [],
    sex:       [],
    agePreset: [],
    lotId:     [],
    pastureId: [],
  })

  const search      = params.get('search')    ?? ''
  const activeCount = countActiveFilters(params)

  // Ao abrir a sheet, inicializa estado local a partir dos params atuais
  function handleOpenChange(next: boolean) {
    if (next) {
      const statusRaw = params.get('status')
      setLocal({
        status:    statusRaw ? statusRaw.split(',').filter(s => s !== 'ALL') : ['ACTIVE'],
        category:  parseParam(params.get('category')),
        sex:       parseParam(params.get('sex')),
        agePreset: parseParam(params.get('agePreset')),
        lotId:     parseParam(params.get('lotId')),
        pastureId: parseParam(params.get('pastureId')),
      })
    }
    setOpen(next)
  }

  // Toggle um valor dentro de um campo multi-select
  function toggle(field: keyof LocalFilters, value: string) {
    setLocal(prev => {
      const curr = prev[field]
      const next = curr.includes(value)
        ? curr.filter(v => v !== value)
        : [...curr, value]
      return { ...prev, [field]: next }
    })
  }

  // Aplica estado local na URL de uma vez (sem navegação por chip)
  const applyFilters = useCallback(() => {
    const next = new URLSearchParams(params.toString())

    // Status: vazio = remover param (todos); senão junta em vírgula
    if (local.status.length === 0) next.delete('status')
    else next.set('status', local.status.join(','))

    const setOrDelete = (key: string, vals: string[]) => {
      if (vals.length === 0) next.delete(key)
      else next.set(key, vals.join(','))
    }
    setOrDelete('category',  local.category)
    setOrDelete('sex',       local.sex)
    setOrDelete('agePreset', local.agePreset)
    setOrDelete('lotId',     local.lotId)
    setOrDelete('pastureId', local.pastureId)

    next.delete('page')
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`)
    })
    setOpen(false)
  }, [local, params, pathname, router])

  const clearAll = useCallback(() => {
    setLocal({ status: [], category: [], sex: [], agePreset: [], lotId: [], pastureId: [] })
  }, [])

  const handleSearch = useDebounce((value: string) => {
    const next = new URLSearchParams(params.toString())
    if (value) next.set('search', value)
    else next.delete('search')
    next.delete('page')
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`)
    })
  }, 400)

  const localActiveCount =
    (local.status.length > 0 && !(local.status.length === 1 && local.status[0] === 'ACTIVE') ? 1 : 0) +
    (local.category.length  > 0 ? 1 : 0) +
    (local.sex.length       > 0 ? 1 : 0) +
    (local.agePreset.length > 0 ? 1 : 0) +
    (local.lotId.length     > 0 ? 1 : 0) +
    (local.pastureId.length > 0 ? 1 : 0)

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
            placeholder="Brinco ou nome — separe por vírgula para vários"
            defaultValue={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11 text-base"
            style={{ fontSize: '16px' }}
          />
        </div>

        {/* Botão de filtro */}
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
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
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto pb-8">
          <SheetHeader className="mb-5">
            <div className="flex items-center justify-between">
              <SheetTitle>Filtros</SheetTitle>
              {localActiveCount > 0 && (
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
              <Chip
                label="Todas"
                active={local.status.length === 0}
                onClick={() => setLocal(p => ({ ...p, status: [] }))}
              />
              {STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={local.status.includes(opt.value)}
                  onClick={() => toggle('status', opt.value)}
                />
              ))}
            </FilterSection>

            {/* Categoria */}
            <FilterSection title="Categoria">
              {CATEGORY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={local.category.includes(opt.value)}
                  onClick={() => toggle('category', opt.value)}
                />
              ))}
            </FilterSection>

            {/* Sexo */}
            <FilterSection title="Sexo">
              {SEX_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={local.sex.includes(opt.value)}
                  onClick={() => toggle('sex', opt.value)}
                />
              ))}
            </FilterSection>

            {/* Idade */}
            <FilterSection title="Idade">
              {AGE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  active={local.agePreset.includes(opt.value)}
                  onClick={() => toggle('agePreset', opt.value)}
                />
              ))}
            </FilterSection>

            {/* Lote */}
            {lots.length > 0 && (
              <FilterSection title="Lote">
                <Chip
                  label="Sem lote"
                  active={local.lotId.includes('none')}
                  onClick={() => toggle('lotId', 'none')}
                />
                {lots.map((l) => (
                  <Chip
                    key={l.id}
                    label={l.name}
                    active={local.lotId.includes(l.id)}
                    onClick={() => toggle('lotId', l.id)}
                  />
                ))}
              </FilterSection>
            )}

            {/* Pasto */}
            {pastures.length > 0 && (
              <FilterSection title="Pasto">
                <Chip
                  label="Sem pasto"
                  active={local.pastureId.includes('none')}
                  onClick={() => toggle('pastureId', 'none')}
                />
                {pastures.map((p) => (
                  <Chip
                    key={p.id}
                    label={p.name}
                    active={local.pastureId.includes(p.id)}
                    onClick={() => toggle('pastureId', p.id)}
                  />
                ))}
              </FilterSection>
            )}

            <Button
              className="w-full h-12 text-base mt-2"
              onClick={applyFilters}
              disabled={isPending}
            >
              {isPending ? 'Carregando…' : 'Ver resultados'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
