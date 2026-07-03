'use client'

import { useState, useTransition } from 'react'
import { useToast }   from '@/hooks/use-toast'
import { Button }     from '@/components/ui/button'
import { Input }      from '@/components/ui/input'
import { Search, Link2, Link2Off, ChevronDown, ChevronUp } from 'lucide-react'
import {
  searchFarmAnimals,
  updateVeterinarySnapshotAnimalLink,
} from '../actions'
import type { VeterinaryMatchCandidate } from '../types'

interface Props {
  snapshotId:  string
  hasLink:     boolean
  candidates?: VeterinaryMatchCandidate[]
}

type AnimalResult = { id: string; tag: string; name: string | null; externalCode: string | null }

export function SnapshotLinkEditor({ snapshotId, hasLink, candidates }: Props) {
  const { toast }                              = useToast()
  const [open,      setOpen]                   = useState(false)
  const [query,     setQuery]                  = useState('')
  const [results,   setResults]                = useState<AnimalResult[]>([])
  const [isPending, startTransition]           = useTransition()
  const [isSearching, startSearchTransition]   = useTransition()

  function handleToggle() {
    setOpen((v) => {
      if (!v) { setQuery(''); setResults([]) }
      return !v
    })
  }

  function handleSearch() {
    if (query.trim().length < 2) return
    startSearchTransition(async () => {
      const result = await searchFarmAnimals(query)
      if (result.success) setResults(result.data)
      else toast({ title: 'Erro na busca', description: result.error, variant: 'destructive' })
    })
  }

  function handleLink(animalId: string) {
    startTransition(async () => {
      const result = await updateVeterinarySnapshotAnimalLink(snapshotId, animalId)
      if (result.success) {
        setOpen(false)
        toast({ title: 'Vínculo salvo' })
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await updateVeterinarySnapshotAnimalLink(snapshotId, null)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Vínculo removido' })
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1 min-w-[120px]">
      <div className="flex gap-1 flex-wrap">
        {/* Botão principal: vincular ou trocar */}
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
        >
          <Link2 className="size-3" />
          {hasLink ? 'Trocar' : 'Vincular'}
          {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>

        {/* Remover vínculo */}
        {hasLink && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
          >
            <Link2Off className="size-3" />
            Remover
          </button>
        )}
      </div>

      {/* Painel expandido */}
      {open && (
        <div className="w-full space-y-1.5 p-2 rounded-md border border-border bg-card shadow-sm mt-1">

          {/* Candidatos do match automático */}
          {candidates && candidates.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Candidatos encontrados:</p>
              <div className="space-y-0.5 max-h-28 overflow-y-auto">
                {candidates.map((c) => (
                  <button
                    key={c.animalId}
                    onClick={() => handleLink(c.animalId)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 w-full text-left text-xs px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
                  >
                    <span className="font-mono text-primary">{c.tag}</span>
                    {c.name && <span className="text-muted-foreground truncate">— {c.name}</span>}
                  </button>
                ))}
              </div>
              <div className="my-1.5 border-t border-border" />
            </div>
          )}

          {/* Busca livre */}
          <p className="text-[10px] font-medium text-muted-foreground">Buscar por brinco ou nome:</p>
          <div className="flex gap-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
              placeholder="BOV-0001 ou nome..."
              className="h-7 text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSearch}
              disabled={isSearching || query.trim().length < 2}
              className="h-7 px-2 shrink-0"
            >
              <Search className="size-3" />
            </Button>
          </div>

          {/* Resultados da busca */}
          {results.length > 0 && (
            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {results.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleLink(a.id)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 w-full text-left text-xs px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
                >
                  <span className="font-mono text-primary">{a.tag}</span>
                  {a.name && <span className="text-muted-foreground truncate">— {a.name}</span>}
                  {a.externalCode && (
                    <span className="text-[10px] text-muted-foreground/70 ml-auto shrink-0">
                      {a.externalCode}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query.trim().length >= 2 && !isSearching && (
            <p className="text-[10px] text-muted-foreground px-1">
              Nenhum animal encontrado para "{query}".
            </p>
          )}
        </div>
      )}
    </div>
  )
}
