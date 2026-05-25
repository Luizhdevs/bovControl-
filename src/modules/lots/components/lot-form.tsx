'use client'

import { useForm }       from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { useTransition } from 'react'
import { useRouter }     from 'next/navigation'
import { useToast }      from '@/hooks/use-toast'

import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Textarea }  from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 }    from 'lucide-react'
import { FormField }  from '@/components/shared/form-field'

import { createLotSchema, updateLotSchema } from '../schema'
import { createLot, updateLot }              from '../actions'
import type { CreateLotInput }               from '../schema'
import type { LotWithDetails, PastureSelectOption } from '../types'
import { cn }                                from '@/lib/utils'
import { LOT_TYPE_LABELS }                   from '@/modules/shared/domain/animal-labels'

// ─── Opções de tipo de lote ────────────────────────────────

const LOT_TYPE_OPTIONS = [
  {
    value:       'LACTATING',
    label:       'Lactação',
    description: 'Vacas em produção',
    color:       'border-purple-500 bg-purple-500/10 text-purple-400',
  },
  {
    value:       'DRY',
    label:       'Seco',
    description: 'Período seco',
    color:       'border-slate-500 bg-slate-500/10 text-slate-300',
  },
  {
    value:       'HEIFER',
    label:       'Novilhas',
    description: 'Fêmeas jovens',
    color:       'border-blue-500 bg-blue-500/10 text-blue-400',
  },
  {
    value:       'CALF',
    label:       'Bezerros',
    description: 'Animais jovens',
    color:       'border-green-500 bg-green-500/10 text-green-400',
  },
  {
    value:       'FATTENING',
    label:       'Engorda',
    description: 'Em fattening',
    color:       'border-orange-500 bg-orange-500/10 text-orange-400',
  },
  {
    value:       'MIXED',
    label:       'Misto',
    description: 'Tipos variados',
    color:       'border-border bg-muted text-muted-foreground',
  },
] as const

// ─── Tipos ─────────────────────────────────────────────────

interface LotFormProps {
  farmId:    string
  mode:      'create' | 'edit'
  lot?:      LotWithDetails
  pastures:  PastureSelectOption[]
  onSuccess?: (id: string) => void
}

// ─── Componente ────────────────────────────────────────────

export function LotForm({
  farmId,
  mode,
  lot,
  pastures,
  onSuccess,
}: LotFormProps) {
  const router             = useRouter()
  const { toast }          = useToast()
  const [isPending, start] = useTransition()

  const schema = mode === 'create' ? createLotSchema : updateLotSchema

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateLotInput>({
    resolver:      zodResolver(schema as typeof createLotSchema),
    defaultValues: {
      name:         lot?.name         ?? '',
      type:         (lot?.type        as CreateLotInput['type']) ?? undefined,
      maxCapacity:  lot?.maxCapacity  ?? undefined,
      pastureId:    lot?.pastureId    ?? undefined,
      observations: lot?.observations ?? '',
    },
  })

  const selectedType = watch('type')

  function onSubmit(data: CreateLotInput) {
    start(async () => {
      const result =
        mode === 'create'
          ? await createLot(farmId, data)
          : await updateLot(lot!.id, farmId, data)

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title: mode === 'create' ? 'Lote criado!' : 'Lote atualizado!',
      })

      if (onSuccess && result.data && 'id' in result.data) {
        onSuccess(result.data.id)
      } else if (mode === 'create' && result.data && 'id' in result.data) {
        router.push(`/lots/${result.data.id}`)
      } else {
        router.push(`/lots/${lot?.id}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">

      {/* ── Informações obrigatórias ─────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Informações Obrigatórias
        </p>

        {/* Nome do lote */}
        <FormField label="Nome do Lote" required error={errors.name?.message}>
          <Input
            {...register('name')}
            placeholder="Ex: Curral de Leite 1, Bezerreiro..."
            className="h-12 text-base"
            style={{ fontSize: '16px' }}
            autoFocus
          />
        </FormField>

        {/* Tipo do lote — grade de botões visuais */}
        <FormField label="Tipo" required error={errors.type?.message}>
          <div className="grid grid-cols-3 gap-2">
            {LOT_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('type', opt.value as CreateLotInput['type'], { shouldValidate: true })}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border py-3 px-2',
                  'text-xs font-medium transition-all duration-150 active:scale-95',
                  selectedType === opt.value
                    ? opt.color
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                )}
              >
                <span className="font-semibold text-[13px]">{opt.label}</span>
                <span className="text-[10px] opacity-70 leading-tight text-center">
                  {opt.description}
                </span>
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <Separator />

      {/* ── Informações opcionais ────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Informações Opcionais
        </p>

        {/* Capacidade máxima */}
        <FormField
          label="Capacidade Máxima"
          hint="Número máximo de animais no lote (para indicador de ocupação)"
          error={errors.maxCapacity?.message}
        >
          <Input
            {...register('maxCapacity')}
            type="number"
            inputMode="numeric"
            placeholder="Ex: 40"
            className="h-12 text-base"
            style={{ fontSize: '16px' }}
          />
        </FormField>

        {/* Pasto vinculado */}
        <FormField
          label="Pasto"
          hint="Pasto onde os animais deste lote ficam"
          error={errors.pastureId?.message}
        >
          {pastures.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nenhum pasto cadastrado.{' '}
              <a href="/pastures/new" className="text-primary hover:underline">
                Cadastrar pasto
              </a>
            </p>
          ) : (
            <Select
              onValueChange={(v) => setValue('pastureId', v === 'none' ? null : v)}
              defaultValue={lot?.pastureId ?? 'none'}
            >
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Selecionar pasto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Sem pasto vinculado</span>
                </SelectItem>
                {pastures.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span>{p.name}</span>
                    {p.areaHectares && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {p.areaHectares} ha
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>

        {/* Observações */}
        <FormField label="Observações" error={errors.observations?.message}>
          <Textarea
            {...register('observations')}
            placeholder="Informações adicionais sobre o lote..."
            className="resize-none text-base min-h-[80px]"
            style={{ fontSize: '16px' }}
          />
        </FormField>
      </div>

      {/* ── Botão fixo no rodapé ──────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border z-10">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-14 text-base font-semibold"
          size="lg"
        >
          {isPending ? (
            <>
              <Loader2 className="size-5 animate-spin mr-2" />
              {mode === 'create' ? 'Criando...' : 'Salvando...'}
            </>
          ) : (
            mode === 'create' ? 'Criar Lote' : 'Salvar Alterações'
          )}
        </Button>
      </div>
    </form>
  )
}
