'use client'

import { useTransition, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  REPRODUCTION_TYPE_LABELS,
  REPRODUCTION_STATUS_LABELS,
} from '@/modules/shared/domain/animal-labels'
import { reproductionSchema, type ReproductionInput } from '../schema'
import { registerReproduction } from '../actions'
import type { AnimalForReproduction } from '../types'

// ─── Opções de enums ────────────────────────────────────────

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

interface ReproductionFormProps {
  farmId:             string
  animals:            AnimalForReproduction[]
  preSelectedAnimal?: AnimalForReproduction
  redirectTo?:        string
}

// ─── Componente ────────────────────────────────────────────

export function ReproductionForm({
  farmId,
  animals,
  preSelectedAnimal,
  redirectTo = '/reproduction',
}: ReproductionFormProps) {
  const router             = useRouter()
  const { toast }          = useToast()
  const [isPending, start] = useTransition()
  const [query, setQuery]  = useState('')

  const { control, handleSubmit, watch, formState: { errors } } = useForm<ReproductionInput>({
    resolver: zodResolver(reproductionSchema),
    defaultValues: {
      animalId:      preSelectedAnimal?.id ?? '',
      type:          'INSEMINATION',
      date:          new Date(),
      status:        'PENDING',
      bullName:      null,
      nextCheckDate: null,
      result:        null,
      notes:         null,
    },
  })

  const selectedType    = watch('type')
  const selectedAnimalId = watch('animalId')
  const selectedAnimal  = animals.find((a) => a.id === selectedAnimalId)

  // Filtragem local
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

  async function onSubmit(values: ReproductionInput) {
    start(async () => {
      const result = await registerReproduction(farmId, values)
      if (result.success) {
        toast({ title: 'Evento registrado com sucesso!' })
        router.push(redirectTo)
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-28">

      {/* Seleção de animal */}
      <div className="space-y-2">
        <Label>Animal</Label>
        <Input
          placeholder="Buscar por tag, nome ou lote…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ fontSize: '16px' }}
        />
        {selectedAnimal && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
            ✓ <strong>{selectedAnimal.tag}</strong>
            {selectedAnimal.name && ` · ${selectedAnimal.name}`}
            {selectedAnimal.lot && ` · ${selectedAnimal.lot.name}`}
          </div>
        )}
        <Controller
          control={control}
          name="animalId"
          render={({ field }) => (
            <div className="rounded-lg border border-border bg-card max-h-48 overflow-y-auto divide-y divide-border/40">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum animal encontrado
                </p>
              ) : (
                filtered.slice(0, 50).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => {
                      field.onChange(a.id)
                      setQuery('')
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-muted transition-colors min-h-[44px]"
                  >
                    <span className="font-medium text-sm">{a.tag}</span>
                    {a.name && (
                      <span className="text-muted-foreground text-xs ml-2">{a.name}</span>
                    )}
                    {a.lot && (
                      <span className="text-muted-foreground text-xs ml-2">· {a.lot.name}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        />
        {errors.animalId && (
          <p className="text-xs text-destructive">{errors.animalId.message}</p>
        )}
      </div>

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

      {/* Data do evento */}
      <div className="space-y-2">
        <Label>Data do evento</Label>
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
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      {/* Status (apenas para PREGNANCY_CHECK) */}
      {selectedType === 'PREGNANCY_CHECK' && (
        <div className="space-y-2">
          <Label>Resultado do diagnóstico</Label>
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
                      'px-3 py-3 rounded-xl border text-sm font-medium transition-colors min-h-[48px]',
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

      {/* Nome do touro (monta natural ou IA) */}
      {(selectedType === 'NATURAL_MATING' || selectedType === 'INSEMINATION') && (
        <div className="space-y-2">
          <Label>
            {selectedType === 'INSEMINATION' ? 'Sêmen / Touro' : 'Nome do touro'}
            <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
          </Label>
          <Controller
            control={control}
            name="bullName"
            render={({ field }) => (
              <Input
                placeholder={
                  selectedType === 'INSEMINATION'
                    ? 'Ex: Sêmen Nelore Elite 123'
                    : 'Ex: Touro Campeão'
                }
                value={field.value ?? ''}
                onChange={field.onChange}
                style={{ fontSize: '16px' }}
              />
            )}
          />
        </div>
      )}

      {/* Próxima data sugerida */}
      <div className="space-y-2">
        <Label>
          {selectedType === 'PREGNANCY_CHECK' ? 'Previsão de parto' : 'Próximo diagnóstico'}
          <span className="text-muted-foreground font-normal ml-1">
            (opcional — calculado automaticamente)
          </span>
        </Label>
        <Controller
          control={control}
          name="nextCheckDate"
          render={({ field }) => (
            <Input
              type="date"
              value={field.value ? format(field.value as Date, 'yyyy-MM-dd') : ''}
              onChange={(e) => field.onChange(e.target.valueAsDate ?? null)}
              style={{ fontSize: '16px' }}
            />
          )}
        />
      </div>

      {/* Observações */}
      <div className="space-y-2">
        <Label>
          Observações
          <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
        </Label>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <Textarea
              placeholder="Anotações adicionais…"
              rows={3}
              value={field.value ?? ''}
              onChange={field.onChange}
              style={{ fontSize: '16px' }}
            />
          )}
        />
      </div>

      {/* Botão fixo */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border z-20">
        <div className="max-w-2xl mx-auto">
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isPending}
          >
            {isPending ? 'Salvando…' : 'Registrar evento'}
          </Button>
        </div>
      </div>
    </form>
  )
}
