'use client'

import { useTransition }     from 'react'
import { useToast }          from '@/hooks/use-toast'
import { AnimalCard }        from '@/modules/animals/components/animal-card'
import { EmptyState }        from '@/components/shared/empty-state'
import { Button }            from '@/components/ui/button'
import { PawPrint, LogOut }  from 'lucide-react'
import { removeAnimalFromLot } from '../actions'
import type { AnimalInLot }  from '../types'

// ─── Tipos ─────────────────────────────────────────────────

interface LotAnimalsListProps {
  animals: AnimalInLot[]
  farmId:  string
  lotId:   string
}

// ─── Item individual ───────────────────────────────────────

function AnimalLotItem({
  animal,
  farmId,
}: {
  animal: AnimalInLot
  farmId: string
}) {
  const [isPending, start] = useTransition()
  const { toast }           = useToast()

  function handleRemove() {
    start(async () => {
      const result = await removeAnimalFromLot(animal.id, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: `${animal.tag} removido do lote.` })
    })
  }

  return (
    <div className="space-y-1">
      {/* Reusar AnimalCard — mesma aparência da listagem de animais */}
      <AnimalCard animal={animal} />

      {/* Botão de remover do lote — abaixo do card */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRemove}
        disabled={isPending}
        className="w-full h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="size-3 mr-1.5" />
        {isPending ? 'Removendo...' : 'Remover do lote'}
      </Button>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Lista de animais de um lote com ação de remoção individual.
 * Reutiliza AnimalCard para manter consistência visual com o módulo Animals.
 *
 * Client Component: precisa de useTransition para feedback de remoção.
 */
export function LotAnimalsList({ animals, farmId, lotId }: LotAnimalsListProps) {
  if (animals.length === 0) {
    return (
      <EmptyState
        icon={<PawPrint />}
        title="Nenhum animal neste lote"
        description="Adicione animais ao lote usando o botão abaixo."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {animals.map((animal) => (
        <AnimalLotItem
          key={animal.id}
          animal={animal}
          farmId={farmId}
        />
      ))}
    </div>
  )
}
