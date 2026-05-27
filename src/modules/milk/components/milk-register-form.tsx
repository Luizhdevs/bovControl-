'use client'

import { useEffect, useTransition } from 'react'
import { useRouter }     from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { useToast }      from '@/hooks/use-toast'
import { useMilkQueue }  from '@/stores/milk-queue'
import { registerMilkingSession } from '../actions'
import { milkingSessionSchema, type MilkingSessionInput } from '../schema'
import { getDefaultShift, MilkShiftTabs } from './milk-shift-tabs'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Label }    from '@/components/ui/label'
import { MilkIcon, Loader2, WifiOff } from 'lucide-react'
import { format }   from 'date-fns'

// ─── Props ─────────────────────────────────────────────────────

interface MilkRegisterFormProps {
  farmId:     string
  redirectTo?: string
}

// ─── Componente ────────────────────────────────────────────────

export function MilkRegisterForm({ farmId, redirectTo = '/milk' }: MilkRegisterFormProps) {
  const router              = useRouter()
  const { toast }           = useToast()
  const { add: addToQueue } = useMilkQueue()
  const [isPending, start]  = useTransition()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<MilkingSessionInput>({
    resolver: zodResolver(milkingSessionSchema),
    defaultValues: {
      shift:      'MORNING',
      date:       new Date(),
      milkingCows: undefined,
    },
  })

  // Aplica o turno local após a montagem (evita hydration mismatch)
  useEffect(() => {
    setValue('shift', getDefaultShift())
  }, [setValue])

  const shift       = watch('shift')
  const totalLiters = watch('totalLiters')
  const milkingCows = watch('milkingCows')

  const avgPerCow = totalLiters > 0 && milkingCows > 0
    ? (totalLiters / milkingCows).toFixed(1)
    : null

  async function onSubmit(data: MilkingSessionInput) {
    start(async () => {
      const result = await registerMilkingSession(farmId, data)

      if (result.success) {
        toast({ title: `Ordenha registrada — ${data.totalLiters}L` })
        router.push(redirectTo)
        return
      }

      if (result.kind === 'network') {
        addToQueue({
          farmId,
          shift:       data.shift,
          date:        format(data.date, 'yyyy-MM-dd'),
          totalLiters: data.totalLiters,
          milkingCows: data.milkingCows,
          notes:       data.notes || null,
        })
        toast({
          title:       'Salvo offline',
          description: 'Será enviado quando a conexão for restabelecida.',
        })
        router.push(redirectTo)
        return
      }

      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-28">

      {/* ── Turno ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Turno *</Label>
        <MilkShiftTabs
          value={shift}
          onChange={(s) => setValue('shift', s, { shouldValidate: true })}
        />
        {errors.shift && (
          <p className="text-xs text-destructive">{errors.shift.message}</p>
        )}
      </div>

      {/* ── Data ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Data *</Label>
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <Input
              type="date"
              value={field.value instanceof Date
                ? format(field.value, 'yyyy-MM-dd')
                : String(field.value ?? '')}
              onChange={(e) => field.onChange(new Date(e.target.value + 'T12:00:00'))}
              className="h-11 text-sm"
              style={{ fontSize: '16px' }}
            />
          )}
        />
        {errors.date && (
          <p className="text-xs text-destructive">{String(errors.date.message)}</p>
        )}
      </div>

      {/* ── Total de litros ───────────────────────────────── */}
      <div className="space-y-2">
        <Label>Total produzido (litros) *</Label>
        <div className="relative">
          <Input
            {...register('totalLiters', { valueAsNumber: true })}
            type="number"
            inputMode="decimal"
            placeholder="0"
            step="0.1"
            min="0.1"
            className="h-20 text-4xl text-center font-bold pr-14 tabular-nums"
            style={{ fontSize: '36px' }}
            autoComplete="off"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">
            L
          </span>
        </div>
        {errors.totalLiters && (
          <p className="text-xs text-destructive">{errors.totalLiters.message}</p>
        )}
      </div>

      {/* ── Vacas ordenhadas ──────────────────────────────── */}
      <div className="space-y-2">
        <Label>Vacas ordenhadas *</Label>
        <div className="relative">
          <Input
            {...register('milkingCows', { valueAsNumber: true })}
            type="number"
            inputMode="numeric"
            placeholder="0"
            step="1"
            min="1"
            className="h-14 text-2xl text-center font-bold pr-16 tabular-nums"
            style={{ fontSize: '24px' }}
            autoComplete="off"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
            vacas
          </span>
        </div>
        {avgPerCow && (
          <p className="text-center text-xs text-muted-foreground">
            Média: {avgPerCow} L/vaca
          </p>
        )}
        {errors.milkingCows && (
          <p className="text-xs text-destructive">{errors.milkingCows.message}</p>
        )}
      </div>

      {/* ── Observações ───────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Observações (opcional)</Label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Anotações sobre a ordenha..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.notes && (
          <p className="text-xs text-destructive">{errors.notes.message}</p>
        )}
      </div>

      {/* ── Submit fixo no rodapé ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-border p-4">
        <Button
          type="submit"
          disabled={isPending}
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
              Registrar Ordenha
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
