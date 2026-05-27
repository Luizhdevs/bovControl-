'use client'

import { useTransition, useMemo } from 'react'
import { useForm }               from 'react-hook-form'
import { zodResolver }           from '@hookform/resolvers/zod'
import { useRouter }             from 'next/navigation'
import { useToast }              from '@/hooks/use-toast'
import { Wheat, Loader2 }        from 'lucide-react'
import { feedSessionSchema, type FeedSessionInput } from '../schema'
import { registerFeedSession }   from '../actions'
import { formatCurrency }        from '@/lib/utils'

interface LotOption {
  id:                string
  name:              string
  type:              string
  activeAnimalCount: number
}

interface FeedTypeOption {
  id:             string
  name:           string
  brand:          string | null
  weightPerBagKg: number
  pricePerBag:    number
}

interface FeedSessionFormProps {
  farmId:    string
  lots:      LotOption[]
  feedTypes: FeedTypeOption[]
}

export function FeedSessionForm({ farmId, lots, feedTypes }: FeedSessionFormProps) {
  const router              = useRouter()
  const [pending, startTx]  = useTransition()
  const { toast }           = useToast()

  const form = useForm<FeedSessionInput>({
    resolver:     zodResolver(feedSessionSchema),
    defaultValues: {
      bagCount: 1,
      date:     new Date(),
    },
  })

  const { watch, register, handleSubmit, formState: { errors } } = form

  const lotId      = watch('lotId')
  const feedTypeId = watch('feedTypeId')
  const bagCount   = watch('bagCount') ?? 0

  const selectedLot      = useMemo(() => lots.find((l) => l.id === lotId),      [lots,      lotId])
  const selectedFeedType = useMemo(() => feedTypes.find((f) => f.id === feedTypeId), [feedTypes, feedTypeId])

  const preview = useMemo(() => {
    if (!selectedFeedType || bagCount <= 0) return null
    const animalCount  = selectedLot?.activeAnimalCount ?? 0
    const totalKg      = bagCount * selectedFeedType.weightPerBagKg
    const totalCost    = bagCount * selectedFeedType.pricePerBag
    const kgPerAnimal  = animalCount > 0 ? totalKg  / animalCount : null
    const costPerAnimal = animalCount > 0 ? totalCost / animalCount : null
    return { animalCount, totalKg, totalCost, kgPerAnimal, costPerAnimal }
  }, [selectedFeedType, selectedLot, bagCount])

  async function onSubmit(data: FeedSessionInput) {
    startTx(async () => {
      const result = await registerFeedSession(farmId, data)
      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' })
        return
      }
      toast({ title: `Alimentação registrada para ${result.data.animalCount} animais` })
      router.push('/feed')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Lote */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Lote</label>
        <select
          {...register('lotId')}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Selecione o lote</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.activeAnimalCount > 0
                ? ` — ${l.activeAnimalCount} animal${l.activeAnimalCount > 1 ? 'is' : ''}`
                : ' — vazio'}
            </option>
          ))}
        </select>
        {errors.lotId && <p className="text-xs text-destructive">{errors.lotId.message}</p>}
      </div>

      {/* Tipo de ração */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Tipo de ração</label>
        <select
          {...register('feedTypeId')}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="">Selecione a ração</option>
          {feedTypes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}{f.brand ? ` (${f.brand})` : ''} — {f.weightPerBagKg}kg/saco
            </option>
          ))}
        </select>
        {errors.feedTypeId && <p className="text-xs text-destructive">{errors.feedTypeId.message}</p>}
      </div>

      {/* Nº de sacos */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Número de sacos</label>
        <input
          type="number"
          min={1}
          step={1}
          {...register('bagCount', { valueAsNumber: true })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-2xl font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40"
          placeholder="0"
        />
        {errors.bagCount && <p className="text-xs text-destructive">{errors.bagCount.message}</p>}
      </div>

      {/* Data */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Data</label>
        <input
          type="date"
          {...register('date', { valueAsDate: true })}
          defaultValue={new Date().toISOString().split('T')[0]}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
      </div>

      {/* Observações */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Observações (opcional)</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Observações sobre a alimentação..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      {/* Preview em tempo real */}
      {preview && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Wheat className="size-3.5" />
            Preview do registro
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Kg totais</p>
              <p className="font-bold tabular-nums">{preview.totalKg.toFixed(1)} kg</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo total</p>
              <p className="font-bold tabular-nums">{formatCurrency(preview.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Animais ativos</p>
              <p className="font-bold tabular-nums">
                {preview.animalCount > 0 ? preview.animalCount : '—'}
              </p>
            </div>
            {preview.kgPerAnimal != null && (
              <div>
                <p className="text-xs text-muted-foreground">Kg / animal</p>
                <p className="font-bold tabular-nums">{preview.kgPerAnimal.toFixed(2)} kg</p>
              </div>
            )}
            {preview.costPerAnimal != null && (
              <div>
                <p className="text-xs text-muted-foreground">Custo / animal</p>
                <p className="font-bold tabular-nums">{formatCurrency(preview.costPerAnimal)}</p>
              </div>
            )}
          </div>
          {preview.animalCount === 0 && (
            <p className="text-xs text-destructive">
              Lote sem animais ativos — não será possível salvar.
            </p>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border md:static md:bg-transparent md:border-0 md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Wheat className="size-4" />}
          {pending ? 'Registrando...' : 'Registrar Alimentação'}
        </button>
      </div>

    </form>
  )
}
