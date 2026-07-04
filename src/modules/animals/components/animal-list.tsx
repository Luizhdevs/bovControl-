'use client'

import { useState, useTransition }        from 'react'
import { PawPrint, ArrowLeftRight, X, Check } from 'lucide-react'
import { AnimalCard, DESKTOP_COLS }        from './animal-card'
import { EmptyState }                      from '@/components/shared/empty-state'
import { Button }                          from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast }                        from '@/hooks/use-toast'
import { bulkMoveAnimalsToLot }            from '@/modules/lots/actions'
import { cn }                              from '@/lib/utils'
import type { AnimalListItem }             from '../types'
import type { LotSelectOption }            from '../types'

interface AnimalListProps {
  animals:    AnimalListItem[]
  isFiltered?: boolean
  lots:       LotSelectOption[]
  farmId:     string
}

export function AnimalList({ animals, isFiltered, lots, farmId }: AnimalListProps) {
  const { toast }                         = useToast()
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set())
  const [targetLotId, setTargetLotId]     = useState('')
  const [isPending, startTransition]      = useTransition()

  const allSelected = animals.length > 0 && animals.every(a => selectedIds.has(a.id))
  const count       = selectedIds.size

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(animals.map(a => a.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setTargetLotId('')
  }

  function handleTransfer() {
    if (!targetLotId || count === 0) return
    startTransition(async () => {
      const result = await bulkMoveAnimalsToLot(farmId, Array.from(selectedIds), targetLotId)
      if (result.success) {
        const { moved, skipped } = result.data!
        toast({ title: `${moved} animal${moved !== 1 ? 'is' : ''} transferido${moved !== 1 ? 's' : ''} com sucesso.${skipped > 0 ? ` (${skipped} ignorado${skipped !== 1 ? 's' : ''})` : ''}` })
        clearSelection()
      } else {
        toast({ title: result.error ?? 'Erro na transferência.', variant: 'destructive' })
      }
    })
  }

  if (animals.length === 0) {
    return (
      <EmptyState
        icon={<PawPrint />}
        title={isFiltered ? 'Nenhum animal encontrado' : 'Nenhum animal cadastrado'}
        description={
          isFiltered
            ? 'Tente ajustar os filtros para encontrar o animal.'
            : 'Cadastre o primeiro animal da fazenda para começar.'
        }
        action={
          !isFiltered
            ? { label: 'Cadastrar Animal', href: '/animals/new' }
            : undefined
        }
      />
    )
  }

  return (
    <>
      {/* ── MOBILE: grade de cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {animals.map((animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
            isSelected={selectedIds.has(animal.id)}
            onSelect={() => toggle(animal.id)}
          />
        ))}
      </div>

      {/* ── DESKTOP: tabela com cabeçalho fixo ───────────── */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        {/* Cabeçalho */}
        <div className={cn(
          'flex items-center',
          'bg-muted/50 border-b border-border',
          'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
        )}>
          {/* Checkbox de selecionar tudo */}
          <div
            className="w-10 flex-none flex items-center justify-center py-2.5 cursor-pointer"
            onClick={toggleAll}
          >
            <div className={cn(
              'size-4 rounded border-2 flex items-center justify-center transition-colors',
              allSelected
                ? 'bg-primary border-primary'
                : count > 0
                  ? 'bg-primary/20 border-primary'
                  : 'border-muted-foreground/40 hover:border-primary/60',
            )}>
              {allSelected && <Check className="size-2.5 text-primary-foreground stroke-[3]" />}
              {!allSelected && count > 0 && <span className="size-2 rounded-sm bg-primary" />}
            </div>
          </div>

          {/* Colunas */}
          <div className={cn('flex-1 grid gap-3 pr-4 py-2.5 items-center', DESKTOP_COLS)}>
            <div /> {/* avatar */}
            <div>Brinco</div>
            <div>Nome</div>
            <div>Categoria</div>
            <div>Raça</div>
            <div>Lote</div>
            <div />
          </div>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-border">
          {animals.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              isSelected={selectedIds.has(animal.id)}
              onSelect={() => toggle(animal.id)}
            />
          ))}
        </div>
      </div>

      {/* ── BARRA DE AÇÕES EM LOTE ───────────────────────── */}
      {count > 0 && (
        <div className={cn(
          'fixed bottom-0 left-0 right-0 z-30',
          'bg-background/95 backdrop-blur-md border-t border-border',
          'px-4 py-3',
          'md:left-56', // alinha com a sidebar (w-56 = 224px)
        )}>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Contagem */}
            <span className="text-sm font-medium text-foreground shrink-0">
              {count} selecionado{count !== 1 ? 's' : ''}
            </span>

            {/* Seletor de lote */}
            <Select value={targetLotId} onValueChange={setTargetLotId}>
              <SelectTrigger className="h-9 text-sm flex-1 min-w-[180px] max-w-xs">
                <SelectValue placeholder="Selecionar lote..." />
              </SelectTrigger>
              <SelectContent>
                {lots.map(lot => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.name}
                    {lot._count.animals > 0 && (
                      <span className="ml-1.5 text-muted-foreground text-xs">
                        ({lot._count.animals})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Confirmar transferência */}
            <Button
              size="sm"
              className="h-9 gap-1.5 shrink-0"
              onClick={handleTransfer}
              disabled={!targetLotId || isPending}
            >
              <ArrowLeftRight className="size-3.5" />
              {isPending ? 'Transferindo...' : 'Transferir'}
            </Button>

            {/* Cancelar */}
            <Button
              size="sm"
              variant="ghost"
              className="h-9 gap-1 shrink-0 text-muted-foreground"
              onClick={clearSelection}
              disabled={isPending}
            >
              <X className="size-3.5" />
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
