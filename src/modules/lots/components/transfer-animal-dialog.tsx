'use client'

import { useState, useTransition } from 'react'
import { useToast }                from '@/hooks/use-toast'
import { Input }                   from '@/components/ui/input'
import { Button }                  from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Search, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn, calculateAge }                          from '@/lib/utils'
import { CATEGORY_LABELS, SEX_LABELS, LOT_TYPE_LABELS } from '@/modules/shared/domain/animal-labels'
import { moveAnimalToLot }                           from '../actions'
import type { AnimalInLot }                          from '../types'

// ─── Tipos ─────────────────────────────────────────────────

interface TransferAnimalDialogProps {
  farmId:    string
  targetLotId:  string
  targetLotName: string
  targetLotType: string
  availableAnimals: AnimalInLot[]
  open:      boolean
  onClose:   () => void
}

// ─── Item de animal na seleção ─────────────────────────────

function AnimalSelectItem({
  animal,
  isSelected,
  onClick,
}: {
  animal:     AnimalInLot
  isSelected: boolean
  onClick:    () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 rounded-lg border p-3',
        'transition-all duration-150 text-left',
        'active:scale-[0.98]',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/30',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'size-10 rounded-lg flex items-center justify-center shrink-0',
          'text-sm font-bold',
          animal.sex === 'FEMALE' ? 'bg-pink-500/15 text-pink-400' : 'bg-sky-500/15 text-sky-400',
        )}
      >
        {animal.name?.[0]?.toUpperCase() ?? animal.tag.slice(-2)}
      </div>

      {/* Informações */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-bold text-foreground">
            {animal.tag}
          </span>
          {animal.name && (
            <span className="text-xs text-muted-foreground truncate">
              · {animal.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {animal.sex === 'FEMALE' ? '♀' : '♂'}{' '}
            {CATEGORY_LABELS[animal.category] ?? animal.category}
          </span>
          {animal.lot && (
            <span className="text-xs text-muted-foreground truncate">
              · {animal.lot.name}
            </span>
          )}
          {!animal.lot && (
            <span className="text-xs text-muted-foreground/60 italic">
              · sem lote
            </span>
          )}
        </div>
      </div>

      {/* Indicador de seleção */}
      {isSelected && (
        <CheckCircle2 className="size-5 text-primary shrink-0" />
      )}
    </button>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Dialog (implementado como Sheet do Radix) para adicionar
 * um animal ao lote atual.
 *
 * Recebe lista pré-carregada de animais disponíveis (máx. 100).
 * Busca é feita no cliente para responsividade imediata.
 *
 * Regra automaticamente aplicada em moveAnimalToLot():
 *   HEIFER + lote LACTATING → COW (via shared domain)
 */
export function TransferAnimalDialog({
  farmId,
  targetLotId,
  targetLotName,
  targetLotType,
  availableAnimals,
  open,
  onClose,
}: TransferAnimalDialogProps) {
  const [search, setSearch]     = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPending, start]      = useTransition()
  const { toast }               = useToast()

  // Filtra animais por tag, nome ou lote atual
  const filtered = availableAnimals.filter((a) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      a.tag.toLowerCase().includes(q)   ||
      a.name?.toLowerCase().includes(q) ||
      a.lot?.name.toLowerCase().includes(q)
    )
  })

  const isLactating = targetLotType === 'LACTATING'

  function handleConfirm() {
    if (!selectedId) return

    start(async () => {
      const result = await moveAnimalToLot(farmId, {
        animalId:    selectedId,
        targetLotId: targetLotId,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      const animal = availableAnimals.find((a) => a.id === selectedId)
      toast({
        title: 'Animal adicionado ao lote!',
        description: animal
          ? `${animal.tag}${animal.name ? ` · ${animal.name}` : ''}`
          : undefined,
      })

      setSearch('')
      setSelectedId(null)
      onClose()
    })
  }

  function handleClose() {
    setSearch('')
    setSelectedId(null)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] flex flex-col">
        <SheetHeader className="shrink-0 pb-4">
          <SheetTitle>Adicionar Animal ao Lote</SheetTitle>
          <SheetDescription>
            Selecione um animal para mover para <strong>{targetLotName}</strong>.
            {isLactating && (
              <span className="block mt-1 text-purple-400">
                ✦ Novilhas movidas para este lote serão promovidas a vacas automaticamente.
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Campo de busca */}
        <div className="relative shrink-0 mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por brinco ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 text-base"
            style={{ fontSize: '16px' }}
            autoFocus
          />
        </div>

        {/* Lista rolável de animais */}
        <div className="flex-1 overflow-y-auto space-y-2 pb-2 min-h-0">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? 'Nenhum animal encontrado' : 'Todos os animais já estão neste lote'}
            </div>
          ) : (
            filtered.map((animal) => (
              <AnimalSelectItem
                key={animal.id}
                animal={animal}
                isSelected={selectedId === animal.id}
                onClick={() => setSelectedId((prev) => (prev === animal.id ? null : animal.id))}
              />
            ))
          )}
        </div>

        {/* Botão de confirmar */}
        <div className="shrink-0 pt-3 border-t border-border">
          <Button
            className="w-full h-12 text-base"
            onClick={handleConfirm}
            disabled={!selectedId || isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="size-4 mr-2" />
            )}
            {selectedId
              ? `Mover para ${targetLotName}`
              : 'Selecione um animal'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
