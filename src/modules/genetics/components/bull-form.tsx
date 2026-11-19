'use client'

import { useTransition } from 'react'
import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { Button }        from '@/components/ui/button'
import { Input }         from '@/components/ui/input'
import { Label }         from '@/components/ui/label'
import { Textarea }      from '@/components/ui/textarea'
import { useToast }      from '@/components/ui/use-toast'
import { createBull, updateBull } from '../actions'
import { geneticProfileSchema, type GeneticProfileInput } from '../schema'
import type { BullForMatch } from '../types'

interface BullFormProps {
  farmId:    string
  bull?:     BullForMatch   // se passado, modo edição
  onSuccess?: () => void
}

function DepField({
  label, name, unit, hint, register, error,
}: {
  label: string
  name: keyof GeneticProfileInput
  unit?: string
  hint?: string
  register: ReturnType<typeof useForm<GeneticProfileInput>>['register']
  error?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {unit && <span className="text-muted-foreground ml-1">({unit})</span>}
        {hint && <span className="text-muted-foreground ml-1 text-[10px]">— {hint}</span>}
      </Label>
      <Input
        type="number"
        step="0.1"
        placeholder="—"
        className="h-8 text-sm"
        {...register(name, { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function BullForm({ farmId, bull, onSuccess }: BullFormProps) {
  const [isPending, start] = useTransition()
  const { toast }          = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<GeneticProfileInput>({
    resolver: zodResolver(geneticProfileSchema),
    defaultValues: bull ? {
      bullName:        bull.bullName,
      externalCode:    bull.externalCode ?? undefined,
      race:            bull.race ?? undefined,
      labName:         bull.labName ?? undefined,
      depLeite:        bull.depLeite ?? undefined,
      depGordura:      bull.depGordura ?? undefined,
      depProteina:     bull.depProteina ?? undefined,
      depDesmame:      bull.depDesmame ?? undefined,
      depSobreano:     bull.depSobreano ?? undefined,
      depParto:        bull.depParto ?? undefined,
      depCcs:          bull.depCcs ?? undefined,
      depTemperamento: bull.depTemperamento ?? undefined,
      depConformacao:  bull.depConformacao ?? undefined,
      depFertilidade:  bull.depFertilidade ?? undefined,
      accLeite:        bull.accLeite ?? undefined,
      accDesmame:      bull.accDesmame ?? undefined,
      notes:           bull.notes ?? undefined,
    } : {},
  })

  const onSubmit = (data: GeneticProfileInput) => {
    start(async () => {
      const result = bull
        ? await updateBull(farmId, bull.id, data)
        : await createBull(farmId, data)

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: bull ? 'Touro atualizado' : 'Touro cadastrado' })
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Identificação */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identificação</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label>Nome *</Label>
            <Input placeholder="Ex: ROZTAC-ET" {...register('bullName')} />
            {errors.bullName && <p className="text-xs text-destructive">{errors.bullName.message}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Código (RGD/HB)</Label>
            <Input placeholder="Ex: HOBRAM01420" className="h-8 text-sm" {...register('externalCode')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Raça</Label>
            <Input placeholder="Ex: Nelore" className="h-8 text-sm" {...register('race')} />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Central / laboratório</Label>
            <Input placeholder="Ex: Alta Genetics" className="h-8 text-sm" {...register('labName')} />
          </div>
        </div>
      </div>

      {/* DEPs — produção */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DEPs — Produção</p>
        <div className="grid grid-cols-3 gap-3">
          <DepField label="Leite"    name="depLeite"    unit="kg"  register={register} />
          <DepField label="Gordura"  name="depGordura"  unit="kg"  register={register} />
          <DepField label="Proteína" name="depProteina" unit="kg"  register={register} />
        </div>
      </div>

      {/* DEPs — crescimento */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DEPs — Crescimento</p>
        <div className="grid grid-cols-2 gap-3">
          <DepField label="Desmame"  name="depDesmame"  unit="kg"  register={register} />
          <DepField label="Sobreano" name="depSobreano" unit="kg"  register={register} />
        </div>
      </div>

      {/* DEPs — saúde / manejo */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DEPs — Saúde / Manejo</p>
        <div className="grid grid-cols-2 gap-3">
          <DepField label="Facilidade parto" name="depParto"   unit="%" hint="menor = melhor" register={register} />
          <DepField label="CCS"              name="depCcs"    unit="×1k" hint="menor = melhor" register={register} />
          <DepField label="Temperamento"     name="depTemperamento" hint="menor = mais calmo" register={register} />
          <DepField label="Conformação"      name="depConformacao"  register={register} />
          <DepField label="Fertilidade"      name="depFertilidade" unit="%" register={register} />
        </div>
      </div>

      {/* Acurácia */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acurácia (0–1)</p>
        <div className="grid grid-cols-2 gap-3">
          <DepField label="Acurácia leite"     name="accLeite"   register={register} />
          <DepField label="Acurácia desmame"   name="accDesmame" register={register} />
        </div>
      </div>

      {/* Notas */}
      <div className="space-y-1">
        <Label className="text-xs">Observações</Label>
        <Textarea rows={2} className="text-sm resize-none" {...register('notes')} />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Salvando…' : bull ? 'Salvar alterações' : 'Cadastrar touro'}
      </Button>
    </form>
  )
}
