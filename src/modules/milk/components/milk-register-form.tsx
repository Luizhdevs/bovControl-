'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { useRouter }    from 'next/navigation'
import { useForm }      from 'react-hook-form'
import { zodResolver }  from '@hookform/resolvers/zod'
import { useToast }     from '@/hooks/use-toast'
import { useMilkQueue } from '@/stores/milk-queue'
import { registerMilkRecord } from '../actions'
import { milkRecordSchema, type MilkRecordInput } from '../schema'
import { getDefaultShift, MilkShiftTabs } from './milk-shift-tabs'
import { MILK_CATEGORY_COLORS } from '../constants'
import { cn } from '@/lib/utils'
import { CATEGORY_LABELS } from '@/modules/shared/domain/animal-labels'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Label }    from '@/components/ui/label'
import { MilkIcon, Search, Loader2, WifiOff } from 'lucide-react'
import type { AnimalForMilk } from '../types'

// ─── Props ─────────────────────────────────────────────────

interface MilkRegisterFormProps {
  farmId:             string
  animals:            AnimalForMilk[]
  preSelectedAnimal?: AnimalForMilk
  redirectTo?:        string
}

// ─── Componente ────────────────────────────────────────────

export function MilkRegisterForm({
  farmId,
  animals,
  preSelectedAnimal,
  redirectTo = '/milk',
}: MilkRegisterFormProps) {
  const router              = useRouter()
  const { toast }           = useToast()
  const { add: addToQueue } = useMilkQueue()

  const [isPending, start]    = useTransition()
  const [search, setSearch]   = useState('')
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalForMilk | null>(
    preSelectedAnimal ?? null,
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MilkRecordInput>({
    resolver: zodResolver(milkRecordSchema),
    defaultValues: {
      animalId:   preSelectedAnimal?.id ?? '',
      // Inicia com MORNING para SSR; useEffect corrige para o turno local
      // sem causar hydration mismatch (servidor não conhece o fuso do cliente).
      shift:      'MORNING',
      recordedAt: new Date(),
    },
  })

  // Aplica o turno local após a montagem do componente
  useEffect(() => {
    setValue('shift', getDefaultShift())
  }, [setValue])

  const shift = watch('shift')

  // Filtragem client-side — inclui lote para busca consistente com quick-register
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

  function handleSelectAnimal(animal: AnimalForMilk) {
    setSelectedAnimal(animal)
    setValue('animalId', animal.id, { shouldValidate: true })
    setSearch('')
  }

  async function onSubmit(data: MilkRecordInput) {
    start(async () => {
      const result = await registerMilkRecord(farmId, data)

      if (result.success) {
        toast({ title: `${data.liters}L registrado com sucesso!` })
        router.push(redirectTo)
        return
      }

      // kind === 'network': falha de rede/servidor → enfileirar offline
      if (result.kind === 'network' && selectedAnimal) {
        addToQueue({
          farmId,
          animalId:   data.animalId,
          animalTag:  selectedAnimal.tag,
          animalName: selectedAnimal.name,
          liters:     data.liters,
          shift:      data.shift,
          recordedAt: (data.recordedAt ?? new Date()).toISOString(),
        })
        toast({
          title:       'Salvo offline',
          description: 'Será enviado quando a conexão for restabelecida.',
        })
        router.push(redirectTo)
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-28">

      {/* ── Seleção de animal ──────────────────────────── */}
      <div className="space-y-2">
        <Label>Animal</Label>

        {selectedAnimal ? (
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-foreground">{selectedAnimal.tag}</span>
                {selectedAnimal.name && (
                  <span className="text-sm text-muted-foreground truncate">
                    · {selectedAnimal.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('text-xs font-medium', MILK_CATEGORY_COLORS[selectedAnimal.category] ?? 'text-muted-foreground')}>
                  {CATEGORY_LABELS[selectedAnimal.category]}
                </span>
                {selectedAnimal.lot && (
                  <>
                    <span className="text-muted-foreground/40 text-xs">·</span>
                    <span className="text-xs text-muted-foreground truncate">{selectedAnimal.lot.name}</span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedAnimal(null); setValue('animalId', '') }}
              className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
            >
              Trocar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por brinco, nome ou lote..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-9"
                style={{ fontSize: '16px' }}
                autoComplete="off"
              />
            </div>

            <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
              {filteredAnimals.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {animals.length === 0
                    ? 'Nenhuma vaca/novilha ativa cadastrada'
                    : 'Nenhum animal encontrado'}
                </div>
              ) : (
                filteredAnimals.map((animal) => (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => handleSelectAnimal(animal)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left"
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
                        <span className={cn('text-xs', MILK_CATEGORY_COLORS[animal.category] ?? 'text-muted-foreground')}>
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

            {errors.animalId && (
              <p className="text-xs text-destructive">{errors.animalId.message}</p>
            )}
          </div>
        )}
      </div>

      {/* ── Turno ──────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Turno</Label>
        <MilkShiftTabs
          value={shift}
          onChange={(s) => setValue('shift', s, { shouldValidate: true })}
        />
        {errors.shift && (
          <p className="text-xs text-destructive">{errors.shift.message}</p>
        )}
      </div>

      {/* ── Produção em litros ─────────────────────────── */}
      <div className="space-y-2">
        <Label>Produção (litros)</Label>
        <div className="relative">
          <Input
            {...register('liters', { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            step="0.1"
            min="0.1"
            max="100"
            className="h-20 text-4xl text-center font-bold pr-14 tabular-nums"
            style={{ fontSize: '36px' }}
            autoComplete="off"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">
            L
          </span>
        </div>
        {errors.liters && (
          <p className="text-xs text-destructive">{errors.liters.message}</p>
        )}
      </div>

      {/* ── Data/hora (opcional) ───────────────────────── */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Data do registro (padrão: agora)</Label>
        <Input
          {...register('recordedAt', { valueAsDate: true })}
          type="datetime-local"
          className="h-11 text-sm"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* ── Submit fixo no rodapé ──────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-border p-4">
        <Button
          type="submit"
          disabled={isPending || !selectedAnimal}
          className="w-full h-13 text-base font-semibold"
        >
          {isPending ? (
            <>
              <Loader2 className="size-5 animate-spin mr-2" />
              Registrando...
            </>
          ) : (
            <>
              <MilkIcon className="size-5 mr-2" />
              Registrar Produção
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-2">
          <WifiOff className="size-3" />
          Funciona offline — sincroniza automaticamente
        </p>
      </div>
    </form>
  )
}
