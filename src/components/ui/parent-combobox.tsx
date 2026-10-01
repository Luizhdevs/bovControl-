'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ParentOption {
  id:       string
  tag:      string
  name:     string | null
  category: string
}

interface Props {
  options:     ParentOption[]
  value:       string | null   // animal id or null
  onChange:    (id: string | null) => void
  placeholder: string
  emptyLabel:  string          // ex: "Não informada"
}

export function ParentCombobox({
  options,
  value,
  onChange,
  placeholder,
  emptyLabel,
}: Props) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const inputRef            = useRef<HTMLInputElement>(null)
  const containerRef        = useRef<HTMLDivElement>(null)
  const id                  = useId()

  const selected = value ? options.find((o) => o.id === value) : null

  // Fechar ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focar input ao abrir
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const filtered = query.trim()
    ? options.filter((o) => {
        const q = query.toLowerCase()
        return (
          o.tag.toLowerCase().includes(q) ||
          (o.name?.toLowerCase().includes(q) ?? false)
        )
      })
    : options

  function handleSelect(id: string | null) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setQuery('')
  }

  const displayLabel = selected
    ? `${selected.tag}${selected.name ? ` · ${selected.name}` : ''}`
    : null

  return (
    <div ref={containerRef} className="relative" id={id}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-base ring-offset-background',
          'hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'transition-colors',
          open && 'ring-2 ring-ring ring-offset-2',
        )}
      >
        <span className={cn('truncate', !displayLabel && 'text-muted-foreground')}>
          {displayLabel ?? placeholder}
        </span>
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {selected && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
              className="rounded p-0.5 hover:bg-muted text-muted-foreground"
              aria-label="Limpar seleção"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por brinco ou nome..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-56 overflow-y-auto py-1">
            {/* Opção vazia */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'flex w-full items-center px-3 py-2 text-sm text-muted-foreground hover:bg-accent/50 transition-colors',
                !value && 'bg-accent/30 font-medium',
              )}
            >
              {emptyLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{query}"
              </div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => handleSelect(o.id)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent/50 transition-colors',
                    o.id === value && 'bg-accent/30 font-medium',
                  )}
                >
                  <span className="truncate">
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{o.tag}</span>
                    {o.name ?? '—'}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {o.category === 'COW' ? 'Vaca' : o.category === 'HEIFER' ? 'Novilha' : o.category === 'CALF' ? 'Bezerra' : o.category}
                  </span>
                </button>
              ))
            )}
          </div>

          {filtered.length > 0 && (
            <div className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              {filtered.length} de {options.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
