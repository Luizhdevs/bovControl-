'use client'

import { useTransition }    from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver }      from '@hookform/resolvers/zod'
import { useRouter }        from 'next/navigation'
import { createHealthEvent, updateHealthEvent } from '../actions'
import { createHealthEventSchema, type CreateHealthEventInput } from '../schema'
import { HEALTH_EVENT_LABELS } from '../types'
import { Button }           from '@/components/ui/button'
import { useToast }         from '@/hooks/use-toast'
import type { HealthEventType } from '@prisma/client'
import { format }           from 'date-fns'

interface AnimalOption {
  id:       string
  tag:      string
  name:     string | null
  category: string
}

interface Props {
  farmId:        string
  animals:       AnimalOption[]
  eventId?:      string   // se fornecido: modo edição
  defaultValues?: Partial<CreateHealthEventInput>
  redirectTo?:   string   // destino após salvar (padrão: /health-events)
}

const TYPE_OPTIONS: { value: HealthEventType; label: string }[] = [
  { value: 'VACCINATION', label: HEALTH_EVENT_LABELS['VACCINATION'] },
  { value: 'DISEASE',     label: HEALTH_EVENT_LABELS['DISEASE']     },
  { value: 'DEWORMING',   label: HEALTH_EVENT_LABELS['DEWORMING']   },
  { value: 'EXAM',        label: HEALTH_EVENT_LABELS['EXAM']        },
  { value: 'MEDICATION',  label: HEALTH_EVENT_LABELS['MEDICATION']  },
  { value: 'OTHER',       label: HEALTH_EVENT_LABELS['OTHER']       },
]

// Tipos que justificam o campo Medicação
const MEDICATION_TYPES: HealthEventType[] = ['VACCINATION', 'DEWORMING', 'MEDICATION', 'DISEASE']

export function HealthEventForm({ farmId, animals, eventId, defaultValues, redirectTo }: Props) {
  const router         = useRouter()
  const { toast }      = useToast()
  const [isPending, startTransition] = useTransition()
  const isEditing      = !!eventId

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateHealthEventInput>({
    resolver: zodResolver(createHealthEventSchema),
    defaultValues: {
      type:        'VACCINATION',
      occurredAt:  new Date(),
      resolved:    false,
      ...defaultValues,
    },
  })

  const selectedType = watch('type')
  const showMedication = MEDICATION_TYPES.includes(selectedType)

  const onSubmit = (data: CreateHealthEventInput) => {
    startTransition(async () => {
      const result = isEditing
        ? await updateHealthEvent(eventId, farmId, data)
        : await createHealthEvent(farmId, data)

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title:       isEditing ? 'Evento atualizado' : 'Evento registrado',
        description: isEditing ? 'Alterações salvas.' : 'Evento de saúde registrado com sucesso.',
      })
      router.push(redirectTo ?? '/health-events')
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Animal */}
      {!isEditing && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Animal *</label>
          <Controller
            name="animalId"
            control={control}
            render={({ field }) => (
              <select
                {...field}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um animal</option>
                {animals.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.tag}{a.name ? ` · ${a.name}` : ''} ({a.category})
                  </option>
                ))}
              </select>
            )}
          />
          {errors.animalId && (
            <p className="text-xs text-destructive">{errors.animalId.message}</p>
          )}
        </div>
      )}

      {/* Tipo */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tipo *</label>
        <div className="grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <Controller
              key={opt.value}
              name="type"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(opt.value)}
                  className={`
                    rounded-lg border px-3 py-2 text-sm font-medium transition-colors
                    ${field.value === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40'}
                  `}
                >
                  {opt.label}
                </button>
              )}
            />
          ))}
        </div>
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Descrição *</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Descreva o evento de saúde..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Medicação — só aparece para tipos relevantes */}
      {showMedication && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Medicação / Vacina</label>
          <input
            {...register('medication')}
            type="text"
            placeholder="Nome do produto, dose, via..."
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.medication && (
            <p className="text-xs text-destructive">{errors.medication.message}</p>
          )}
        </div>
      )}

      {/* Data + Custo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Data *</label>
          <Controller
            name="occurredAt"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                value={field.value instanceof Date
                  ? format(field.value, 'yyyy-MM-dd')
                  : String(field.value ?? '')}
                onChange={(e) => field.onChange(new Date(e.target.value + 'T12:00:00'))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            )}
          />
          {errors.occurredAt && (
            <p className="text-xs text-destructive">{errors.occurredAt.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Custo (R$)</label>
          <input
            {...register('cost')}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {errors.cost && (
            <p className="text-xs text-destructive">{errors.cost.message}</p>
          )}
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Observações</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Notas adicionais, resultado de exame..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* Resolvido */}
      <Controller
        name="resolved"
        control={control}
        render={({ field }) => (
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              role="checkbox"
              aria-checked={field.value}
              onClick={() => field.onChange(!field.value)}
              className={`
                size-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer
                ${field.value
                  ? 'bg-primary border-primary text-primary-foreground'
                  : 'border-input bg-background'}
              `}
            >
              {field.value && <span className="text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm">Marcar como resolvido</span>
          </label>
        )}
      />

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending
            ? (isEditing ? 'Salvando...' : 'Registrando...')
            : (isEditing ? 'Salvar alterações' : 'Registrar evento')}
        </Button>
      </div>
    </form>
  )
}
