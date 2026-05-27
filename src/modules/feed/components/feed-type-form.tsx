'use client'

import { useTransition }   from 'react'
import { useForm }         from 'react-hook-form'
import { zodResolver }     from '@hookform/resolvers/zod'
import { useRouter }       from 'next/navigation'
import { useToast }        from '@/hooks/use-toast'
import { Loader2, Save }   from 'lucide-react'
import { feedTypeSchema, type FeedTypeInput } from '../schema'
import { createFeedType, updateFeedType }     from '../actions'
import type { FeedTypeItem } from '../types'

interface FeedTypeFormProps {
  farmId:    string
  initial?:  FeedTypeItem   // se fornecido → modo edição
}

export function FeedTypeForm({ farmId, initial }: FeedTypeFormProps) {
  const router             = useRouter()
  const [pending, startTx] = useTransition()
  const { toast }          = useToast()
  const isEdit             = !!initial

  const { register, handleSubmit, formState: { errors } } = useForm<FeedTypeInput>({
    resolver:     zodResolver(feedTypeSchema),
    defaultValues: initial
      ? {
          name:           initial.name,
          brand:          initial.brand ?? '',
          weightPerBagKg: initial.weightPerBagKg,
          pricePerBag:    initial.pricePerBag,
          proteinPercent: initial.proteinPercent ?? undefined,
          active:         initial.active,
        }
      : { active: true },
  })

  async function onSubmit(data: FeedTypeInput) {
    startTx(async () => {
      const result = isEdit
        ? await updateFeedType(initial!.id, farmId, data)
        : await createFeedType(farmId, data)

      if (!result.success) {
        toast({ title: result.error, variant: 'destructive' })
        return
      }
      toast({ title: isEdit ? 'Ração atualizada' : 'Tipo de ração criado' })
      router.push('/feed-types')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Nome */}
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-sm font-medium">Nome <span className="text-destructive">*</span></label>
          <input
            {...register('name')}
            placeholder="Ex: Ração Lactação"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {/* Marca */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Marca</label>
          <input
            {...register('brand')}
            placeholder="Ex: Nutrimilho"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Proteína */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Proteína (%)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={100}
            {...register('proteinPercent', { valueAsNumber: true })}
            placeholder="Ex: 22"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.proteinPercent && <p className="text-xs text-destructive">{errors.proteinPercent.message}</p>}
        </div>

        {/* Peso por saco */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Peso por saco (kg) <span className="text-destructive">*</span></label>
          <input
            type="number"
            step="0.5"
            min={0.5}
            {...register('weightPerBagKg', { valueAsNumber: true })}
            placeholder="Ex: 30"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.weightPerBagKg && <p className="text-xs text-destructive">{errors.weightPerBagKg.message}</p>}
        </div>

        {/* Preço por saco */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Preço por saco (R$) <span className="text-destructive">*</span></label>
          <input
            type="number"
            step="0.01"
            min={0}
            {...register('pricePerBag', { valueAsNumber: true })}
            placeholder="Ex: 85.50"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {errors.pricePerBag && <p className="text-xs text-destructive">{errors.pricePerBag.message}</p>}
        </div>

        {/* Ativo */}
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            id="active"
            {...register('active')}
            className="size-4 rounded border-border"
          />
          <label htmlFor="active" className="text-sm text-muted-foreground">Ração ativa (disponível para registro)</label>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border md:static md:bg-transparent md:border-0 md:p-0 md:backdrop-blur-none">
        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {pending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar tipo de ração'}
        </button>
      </div>
    </form>
  )
}
