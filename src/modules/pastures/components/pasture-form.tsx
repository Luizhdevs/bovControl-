'use client'

import { useTransition }  from 'react'
import { useRouter }      from 'next/navigation'
import { useForm }        from 'react-hook-form'
import { zodResolver }    from '@hookform/resolvers/zod'
import { useToast }       from '@/hooks/use-toast'
import { createPasture, updatePasture } from '../actions'
import { createPastureSchema, type CreatePastureInput } from '../schema'
import { Input }   from '@/components/ui/input'
import { Button }  from '@/components/ui/button'
import { Label }   from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'

// ─── Props ─────────────────────────────────────────────────

interface PastureFormProps {
  farmId:     string
  pastureId?: string    // se informado → edição; senão → criação
  defaultValues?: Partial<CreatePastureInput>
}

// ─── Componente ────────────────────────────────────────────

export function PastureForm({ farmId, pastureId, defaultValues }: PastureFormProps) {
  const router         = useRouter()
  const { toast }      = useToast()
  const [isPending, start] = useTransition()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreatePastureInput>({
    resolver:      zodResolver(createPastureSchema),
    defaultValues: {
      name:         defaultValues?.name         ?? '',
      areaHectares: defaultValues?.areaHectares ?? null,
      grassType:    defaultValues?.grassType    ?? null,
      maxCapacity:  defaultValues?.maxCapacity  ?? null,
    },
  })

  async function onSubmit(data: CreatePastureInput) {
    start(async () => {
      const result = pastureId
        ? await updatePasture(pastureId, farmId, data)
        : await createPasture(farmId, data)

      if (result.success) {
        toast({ title: pastureId ? 'Pasto atualizado!' : 'Pasto criado!' })
        router.push('/pastures')
      } else {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome do pasto *</Label>
        <Input
          id="name"
          placeholder="Ex.: Pasto A, Campo 1..."
          style={{ fontSize: '16px' }}
          {...register('name')}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Área */}
      <div className="space-y-2">
        <Label htmlFor="areaHectares">Área (hectares)</Label>
        <Input
          id="areaHectares"
          type="number"
          inputMode="decimal"
          placeholder="Ex.: 12.5"
          step="0.1"
          min="0.1"
          style={{ fontSize: '16px' }}
          {...register('areaHectares', { valueAsNumber: true, setValueAs: (v) => (v === '' || isNaN(Number(v)) ? null : Number(v)) })}
        />
        {errors.areaHectares && <p className="text-xs text-destructive">{errors.areaHectares.message}</p>}
      </div>

      {/* Tipo de capim */}
      <div className="space-y-2">
        <Label htmlFor="grassType">Tipo de capim / gramínea</Label>
        <Input
          id="grassType"
          placeholder="Ex.: Braquiária, Tifton, Mombaça..."
          style={{ fontSize: '16px' }}
          {...register('grassType')}
        />
        {errors.grassType && <p className="text-xs text-destructive">{errors.grassType.message}</p>}
      </div>

      {/* Capacidade máxima */}
      <div className="space-y-2">
        <Label htmlFor="maxCapacity">Capacidade máxima (animais)</Label>
        <Input
          id="maxCapacity"
          type="number"
          inputMode="numeric"
          placeholder="Ex.: 50"
          min="1"
          style={{ fontSize: '16px' }}
          {...register('maxCapacity', { valueAsNumber: true, setValueAs: (v) => (v === '' || isNaN(Number(v)) ? null : Math.round(Number(v))) })}
        />
        {errors.maxCapacity && <p className="text-xs text-destructive">{errors.maxCapacity.message}</p>}
      </div>

      {/* Botões */}
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
            ? <><Loader2 className="size-4 animate-spin mr-2" /> Salvando...</>
            : <><Save className="size-4 mr-2" /> {pastureId ? 'Salvar alterações' : 'Criar pasto'}</>}
        </Button>
      </div>
    </form>
  )
}
