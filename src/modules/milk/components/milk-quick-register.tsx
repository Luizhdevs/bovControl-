'use client'

/**
 * Botão + Sheet de registro rápido de leite.
 * Two-step: seleciona animal → digita litros. Mínimo de toques.
 * Usado no dashboard /milk para registro sem sair da página.
 */

import { useState, useTransition, useMemo } from 'react'
import { Plus, MilkIcon, Search, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Input }  from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label }  from '@/components/ui/label'
import { useToast }     from '@/hooks/use-toast'
import { useMilkQueue } from '@/stores/milk-queue'
import { registerMilkRecord } from '../actions'
import { getDefaultShift, MilkShiftTabs } from './milk-shift-tabs'
import { MILK_CATEGORY_COLORS, isOfflineCandidate } from '../constants'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/modules/shared/domain/animal-labels'
import type { AnimalForMilk } from '../types'

// ─── Estado tipado como union discriminada ─────────────────

type QuickRegisterStep =
  | { kind: 'animal' }
  | { kind: 'liters'; animal: AnimalForMilk }

// ─── Props ─────────────────────────────────────────────────

interface MilkQuickRegisterProps {
  farmId:  string
  animals: AnimalForMilk[]
}

// ─── Componente ────────────────────────────────────────────

export function MilkQuickRegister({ farmId, animals }: MilkQuickRegisterProps) {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState<QuickRegisterStep>({ kind: 'animal' })
  const [search, setSearch]   = useState('')
  const [liters, setLiters]   = useState('')
  const [shift, setShift]     = useState(getDefaultShift())
  const [isPending, start]    = useTransition()
  const { toast }             = useToast()
  const { add: addToQueue }   = useMilkQueue()

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setStep({ kind: 'animal' })
      setSearch('')
      setLiters('')
      setShift(getDefaultShift())
    }
  }

  // Filtragem client-side — tag, nome e lote (consistente com MilkRegisterForm)
  const filteredAnimals = useMemo(() => {
    if (!search.trim()) return animals
    const q = search.toLowerCase()
    return animals.filter(
      (a) =>
        a.tag.toLowerCase().includes(q) ||
        (a.name ?? '').toLowerCase().includes(q) ||
        (a.lot?.name ?? '').toLowerCase().includes(q),
    )
  }, [animals, search])

  function handleSubmit() {
    if (step.kind !== 'liters') return

    const value = parseFloat(liters.replace(',', '.'))
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Produção inválida', variant: 'destructive' })
      return
    }

    start(async () => {
      const result = await registerMilkRecord(farmId, {
        animalId:   step.animal.id,
        liters:     value,
        shift,
        recordedAt: new Date(),
      })

      if (result.success) {
        toast({ title: `${value}L registrado!` })
        handleOpenChange(false)
        return
      }

      if (isOfflineCandidate(result.error)) {
        addToQueue({
          farmId,
          animalId:   step.animal.id,
          animalTag:  step.animal.tag,
          animalName: step.animal.name,
          liters:     value,
          shift,
          recordedAt: new Date().toISOString(),
        })
        toast({ title: 'Salvo offline', description: 'Sincroniza automaticamente.' })
        handleOpenChange(false)
        return
      }

      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="w-full h-13 text-base font-semibold gap-2"
      >
        <Plus className="size-5" />
        Registrar Leite
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <MilkIcon className="size-5 text-cyan-400" />
              {step.kind === 'animal' ? 'Selecionar Animal' : 'Registrar Produção'}
            </SheetTitle>
            {step.kind === 'animal' && (
              <SheetDescription>
                Selecione a vaca ou novilha a ser ordenhada.
              </SheetDescription>
            )}
          </SheetHeader>

          {/* ── Step 1: Escolher animal ─────────────────── */}
          {step.kind === 'animal' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar brinco, nome ou lote..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-9"
                  style={{ fontSize: '16px' }}
                  autoFocus
                  autoComplete="off"
                />
              </div>

              <div className="space-y-0.5 max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {filteredAnimals.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {animals.length === 0
                      ? 'Nenhuma vaca ativa cadastrada'
                      : 'Nenhum animal encontrado'}
                  </div>
                ) : (
                  filteredAnimals.map((animal) => (
                    <button
                      key={animal.id}
                      type="button"
                      onClick={() => setStep({ kind: 'liters', animal })}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-left min-h-[56px]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono text-sm font-bold">{animal.tag}</span>
                          {animal.name && (
                            <span className="text-sm text-muted-foreground truncate">
                              · {animal.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-xs', MILK_CATEGORY_COLORS[animal.category] ?? '')}>
                            {CATEGORY_LABELS[animal.category]}
                          </span>
                          {animal.lot && (
                            <span className="text-xs text-muted-foreground truncate">
                              · {animal.lot.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Turno + litros ──────────────────── */}
          {step.kind === 'liters' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold">{step.animal.tag}</span>
                  {step.animal.name && (
                    <span className="text-sm text-muted-foreground ml-1.5">
                      · {step.animal.name}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep({ kind: 'animal' })}
                  className="text-xs text-primary underline"
                >
                  Trocar
                </button>
              </div>

              <div className="space-y-2">
                <Label>Turno</Label>
                <MilkShiftTabs value={shift} onChange={setShift} disabled={isPending} />
              </div>

              <div className="space-y-2">
                <Label>Produção (litros)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.0"
                    step="0.1"
                    min="0.1"
                    max="100"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    className="h-20 text-4xl text-center font-bold pr-14"
                    style={{ fontSize: '36px' }}
                    autoFocus
                    autoComplete="off"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">
                    L
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !liters || parseFloat(liters) <= 0}
                className="w-full h-13 text-base font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-5 animate-spin mr-2" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-5 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
