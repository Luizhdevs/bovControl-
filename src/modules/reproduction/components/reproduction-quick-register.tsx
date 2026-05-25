'use client'

import { useTransition, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format } from 'date-fns'
import { Plus, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  REPRODUCTION_TYPE_LABELS,
  REPRODUCTION_STATUS_LABELS,
} from '@/modules/shared/domain/animal-labels'
import { reproductionSchema, type ReproductionInput } from '../schema'
import { registerReproduction } from '../actions'
import type { AnimalForReproduction } from '../types'

// ─── Discriminated union de etapas ────────────────────────

type QuickStep =
  | { kind: 'animal' }
  | { kind: 'event'; animal: AnimalForReproduction }

const TYPE_OPTIONS = [
  { value: 'INSEMINATION',    label: REPRODUCTION_TYPE_LABELS['INSEMINATION']!,    emoji: '💉' },
  { value: 'NATURAL_MATING',  label: REPRODUCTION_TYPE_LABELS['NATURAL_MATING']!,  emoji: '🐂' },
  { value: 'PREGNANCY_CHECK', label: REPRODUCTION_TYPE_LABELS['PREGNANCY_CHECK']!, emoji: '🔬' },
] as const

const STATUS_OPTIONS = [
  { value: 'PENDING',   label: REPRODUCTION_STATUS_LABELS['PENDING']!   },
  { value: 'CONFIRMED', label: REPRODUCTION_STATUS_LABELS['CONFIRMED']! },
  { value: 'FAILED',    label: REPRODUCTION_STATUS_LABELS['FAILED']!    },
] as const

// ─── Props ─────────────────────────────────────────────────

interface ReproductionQuickRegisterProps {
  farmId:  string
  animals: AnimalForReproduction[]
}

// ─── Componente ────────────────────────────────────────────

export function ReproductionQuickRegister({
  farmId,
  animals,
}: ReproductionQuickRegisterProps) {
  const [open, setOpen]    = useState(false)
  const [step, setStep]    = useState<QuickStep>({ kind: 'animal' })
  const [query, setQuery]  = useState('')
  const [isPending, start] = useTransition()
  const { toast }          = useToast()

  const { control, handleSubmit, setValue, watch, reset } = useForm<ReproductionInput>({
    resolver: zodResolver(reproductionSchema),
    defaultValues: {
      animalId:      '',
      type:          'INSEMINATION',
      date:          new Date(),
      status:        'PENDING',
      bullName:      null,
      nextCheckDate: null,
      result:        null,
      notes:         null,
    },
  })

  const selectedType = watch('type')

  function handleOpen(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setStep({ kind: 'animal' })
      setQuery('')
      reset()
    }
  }

  function selectAnimal(animal: AnimalForReproduction) {
    setValue('animalId', animal.id)
    setStep({ kind: 'event', animal })
    setQuery('')
  }

  function handleBack() {
    setStep({ kind: 'animal' })
    setQuery('')
  }

  async function onSubmit(values: ReproductionInput) {
    start(async () => {
      const result = await registerReproduction(farmId, values)
      if (result.success) {
        toast({ title: 'Evento registrado!' })
        handleOpen(false)
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  const filtered = query.trim()
    ? animals.filter((a) => {
        const q = query.toLowerCase()
        return (
          a.tag.toLowerCase().includes(q) ||
          (a.name?.toLowerCase().includes(q) ?? false) ||
          (a.lot?.name.toLowerCase().includes(q) ?? false)
        )
      })
    : animals

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button className="w-full h-12 gap-2 text-base font-semibold">
          <Plus className="size-4" />
          Registrar evento
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            {step.kind === 'event' && (
              <button
                onClick={handleBack}
                className="size-8 flex items-center justify-center rounded-full hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            )}
            <SheetTitle>
              {step.kind === 'animal' ? 'Selecionar animal' : `Evento — ${step.animal.tag}`}
            </SheetTitle>
          </div>
        </SheetHeader>

        {/* Etapa 1: seleção de animal */}
        {step.kind === 'animal' && (
          <div className="space-y-3">
            <Input
              placeholder="Buscar por tag, nome ou lote…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              style={{ fontSize: '16px' }}
            />
            <div className="rounded-xl border border-border divide-y divide-border/40 max-h-[50dvh] overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma fêmea encontrada
                </p>
              ) : (
                filtered.slice(0, 80).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => selectAnimal(a)}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors min-h-[52px] flex items-center gap-3"
                  >
                    <span className="font-semibold text-sm">{a.tag}</span>
                    {a.name && <span className="text-muted-foreground text-xs">{a.name}</span>}
                    {a.lot && (
                      <span className="text-muted-foreground text-xs ml-auto shrink-0">
                        {a.lot.name}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Etapa 2: registro do evento */}
        {step.kind === 'event' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-4">

            {/* Tipo de evento */}
            <div className="space-y-2">
              <Label>Tipo de evento</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors min-h-[52px]',
                          field.value === opt.value
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span className="text-xl">{opt.emoji}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Data</Label>
              <Controller
                control={control}
                name="date"
                render={({ field }) => (
                  <Input
                    type="date"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={(e) => field.onChange(e.target.valueAsDate ?? new Date())}
                    style={{ fontSize: '16px' }}
                  />
                )}
              />
            </div>

            {/* Status (apenas PREGNANCY_CHECK) */}
            {selectedType === 'PREGNANCY_CHECK' && (
              <div className="space-y-2">
                <Label>Resultado</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            'px-2 py-3 rounded-xl border text-xs font-medium transition-colors min-h-[48px]',
                            field.value === opt.value
                              ? opt.value === 'CONFIRMED'
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                : opt.value === 'FAILED'
                                  ? 'border-red-500 bg-red-500/10 text-red-400'
                                  : 'border-primary bg-primary/10 text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>
            )}

            {/* Touro (monta/IA) */}
            {(selectedType === 'NATURAL_MATING' || selectedType === 'INSEMINATION') && (
              <div className="space-y-2">
                <Label>
                  {selectedType === 'INSEMINATION' ? 'Sêmen' : 'Touro'}
                  <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
                </Label>
                <Controller
                  control={control}
                  name="bullName"
                  render={({ field }) => (
                    <Input
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder={selectedType === 'INSEMINATION' ? 'Código do sêmen…' : 'Nome do touro…'}
                      style={{ fontSize: '16px' }}
                    />
                  )}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isPending}
            >
              {isPending ? 'Salvando…' : 'Registrar evento'}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
