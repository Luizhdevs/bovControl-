'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Camera, ChevronDown, ChevronUp } from 'lucide-react'
import { FormField } from '@/components/shared/form-field'

import { createAnimalSchema, updateAnimalSchema } from '../schema'
import { createAnimal, updateAnimal } from '../actions'
import type { CreateAnimalInput, UpdateAnimalInput } from '../schema'
import type { AnimalWithRelations, AnimalSelectOption, LotSelectOption } from '../types'
import { cn } from '@/lib/utils'

// ─── Tipos ─────────────────────────────────────────────────

interface AnimalFormProps {
  farmId:    string
  mode:      'create' | 'edit'
  animal?:   AnimalWithRelations
  lots:      LotSelectOption[]
  mothers:   AnimalSelectOption[]
  fathers:   AnimalSelectOption[]
  onSuccess?: (id: string) => void
}

// ─── Opções de campo ───────────────────────────────────────

const FEMALE_CATEGORIES = [
  { value: 'CALF',   label: 'Bezerra' },
  { value: 'HEIFER', label: 'Novilha' },
  { value: 'COW',    label: 'Vaca' },
]

const MALE_CATEGORIES = [
  { value: 'CALF',  label: 'Bezerro' },
  { value: 'BULL',  label: 'Touro' },
  { value: 'STEER', label: 'Boi' },
]

const PURPOSES = [
  { value: 'DAIRY', label: 'Leite' },
  { value: 'BEEF',  label: 'Corte' },
  { value: 'BOTH',  label: 'Misto' },
]

const BIRTH_TYPES = [
  { value: 'NATURAL',          label: 'Natural' },
  { value: 'INSEMINATION',     label: 'Inseminação Artificial' },
  { value: 'EMBRYO_TRANSFER',  label: 'Transferência de Embrião' },
]

// ─── Toggle de sexo (mobile-first) ────────────────────────

interface SexToggleProps {
  value:    'MALE' | 'FEMALE' | ''
  onChange: (v: 'MALE' | 'FEMALE') => void
  error?:   string
}

function SexToggle({ value, onChange, error }: SexToggleProps) {
  return (
    <FormField label="Sexo" required error={error}>
      <div className="grid grid-cols-2 gap-2">
        {(['FEMALE', 'MALE'] as const).map((sex) => (
          <button
            key={sex}
            type="button"
            onClick={() => onChange(sex)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg border py-4',
              'text-base font-semibold transition-all duration-150',
              'active:scale-95',
              value === sex
                ? sex === 'FEMALE'
                  ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                  : 'border-sky-500 bg-sky-500/10 text-sky-400'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50',
            )}
          >
            <span className="text-xl">{sex === 'FEMALE' ? '♀' : '♂'}</span>
            {sex === 'FEMALE' ? 'Fêmea' : 'Macho'}
          </button>
        ))}
      </div>
    </FormField>
  )
}

// ─── Componente principal ──────────────────────────────────

export function AnimalForm({
  farmId,
  mode,
  animal,
  lots,
  mothers,
  fathers,
  onSuccess,
}: AnimalFormProps) {
  const router              = useRouter()
  const { toast }           = useToast()
  const [isPending, start]  = useTransition()
  const [showOptional, setShowOptional] = useState(mode === 'edit')

  // ── Formulário ──────────────────────────────────────────

  type FormData = mode extends 'create' ? CreateAnimalInput : UpdateAnimalInput

  const schema = mode === 'create' ? createAnimalSchema : updateAnimalSchema

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateAnimalInput>({
    resolver:      zodResolver(schema as typeof createAnimalSchema),
    defaultValues: {
      sex:          (animal?.sex        as CreateAnimalInput['sex']) ?? undefined,
      category:     (animal?.category   as CreateAnimalInput['category']) ?? undefined,
      purpose:      (animal?.purpose    as CreateAnimalInput['purpose']) ?? 'DAIRY',
      name:         animal?.name        ?? '',
      breed:        animal?.breed       ?? 'Mestiço',
      birthDate:    animal?.birthDate   ? new Date(animal.birthDate) : undefined,
      birthType:    (animal?.birthType  as CreateAnimalInput['birthType']) ?? undefined,
      motherId:     animal?.motherId    ?? undefined,
      fatherId:     animal?.fatherId    ?? undefined,
      lotId:        animal?.lotId       ?? undefined,
      observations: animal?.observations ?? '',
    },
  })

  const selectedSex      = watch('sex')
  const categoryOptions  = selectedSex === 'FEMALE' ? FEMALE_CATEGORIES : MALE_CATEGORIES

  // ── Submit ──────────────────────────────────────────────

  function onSubmit(data: CreateAnimalInput) {
    start(async () => {
      const result =
        mode === 'create'
          ? await createAnimal(farmId, data)
          : await updateAnimal(animal!.id, farmId, data)

      if (!result.success) {
        toast({
          title:       'Erro',
          description: result.error,
          variant:     'destructive',
        })
        return
      }

      toast({
        title: mode === 'create' ? 'Animal cadastrado!' : 'Animal atualizado!',
        description: mode === 'create' ? 'O animal foi cadastrado com sucesso.' : undefined,
      })

      if (onSuccess && result.data && 'id' in result.data) {
        onSuccess(result.data.id)
      } else if (mode === 'create' && result.data && 'id' in result.data) {
        router.push(`/animals/${result.data.id}`)
      } else {
        router.push(`/animals/${animal?.id}`)
      }
    })
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">

      {/* ── Seção obrigatória ───────────────────────────── */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Informações Obrigatórias
        </p>

        {/* Sexo */}
        <SexToggle
          value={selectedSex ?? ''}
          onChange={(v) => {
            setValue('sex', v, { shouldValidate: true })
            // Limpa categoria ao trocar sexo
            setValue('category', undefined as unknown as CreateAnimalInput['category'])
          }}
          error={errors.sex?.message}
        />

        {/* Categoria */}
        <FormField label="Categoria" required error={errors.category?.message}>
          <div className="grid grid-cols-3 gap-2">
            {categoryOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={!selectedSex}
                onClick={() => setValue('category', opt.value as CreateAnimalInput['category'], { shouldValidate: true })}
                className={cn(
                  'rounded-lg border py-3 text-sm font-medium transition-all',
                  'active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed',
                  watch('category') === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>

        {/* Finalidade */}
        <FormField label="Finalidade" required error={errors.purpose?.message}>
          <div className="grid grid-cols-3 gap-2">
            {PURPOSES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue('purpose', opt.value as CreateAnimalInput['purpose'], { shouldValidate: true })}
                className={cn(
                  'rounded-lg border py-3 text-sm font-medium transition-all',
                  'active:scale-95',
                  watch('purpose') === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FormField>
      </div>

      <Separator />

      {/* ── Seção opcional (colapsável no create) ──────── */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowOptional((v) => !v)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground py-1"
        >
          <span>Informações Opcionais</span>
          {showOptional ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        {showOptional && (
          <div className="space-y-4">

            {/* Nome */}
            <FormField label="Nome" error={errors.name?.message}>
              <Input
                {...register('name')}
                placeholder="Ex: Mimosa, Estrela..."
                className="h-12 text-base"
                style={{ fontSize: '16px' }}
              />
            </FormField>

            {/* Raça */}
            <FormField label="Raça" error={errors.breed?.message}>
              <Input
                {...register('breed')}
                placeholder="Ex: Nelore, Girolando..."
                className="h-12 text-base"
                style={{ fontSize: '16px' }}
              />
            </FormField>

            {/* Data de nascimento */}
            <FormField label="Data de Nascimento" error={errors.birthDate?.message}>
              <Input
                {...register('birthDate')}
                type="date"
                className="h-12 text-base"
                max={new Date().toISOString().split('T')[0]}
              />
            </FormField>

            {/* Tipo de nascimento */}
            <FormField
              label="Origem"
              hint="Como o animal nasceu ou foi adquirido"
              error={errors.birthType?.message}
            >
              <Select
                onValueChange={(v) => setValue('birthType', v as CreateAnimalInput['birthType'])}
                defaultValue={animal?.birthType ?? undefined}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecionar origem..." />
                </SelectTrigger>
                <SelectContent>
                  {BIRTH_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Lote */}
            <FormField
              label="Lote"
              hint="Lote ao qual o animal pertence"
              error={errors.lotId?.message}
            >
              <Select
                onValueChange={(v) => setValue('lotId', v === 'none' ? null : v)}
                defaultValue={animal?.lotId ?? 'none'}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecionar lote..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem lote</SelectItem>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      <span>{lot.name}</span>
                      {lot.maxCapacity && (
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({lot._count.animals}/{lot.maxCapacity})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Mãe */}
            <FormField
              label="Mãe"
              hint="Matriz (fêmea)"
              error={errors.motherId?.message}
            >
              <Select
                onValueChange={(v) => setValue('motherId', v === 'none' ? null : v)}
                defaultValue={animal?.motherId ?? 'none'}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecionar mãe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informada</SelectItem>
                  {mothers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.tag}{m.name ? ` · ${m.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Pai */}
            <FormField
              label="Pai / Sêmen"
              hint="Reprodutor (macho) ou identificação do sêmen"
              error={errors.fatherId?.message}
            >
              <Select
                onValueChange={(v) => setValue('fatherId', v === 'none' ? null : v)}
                defaultValue={animal?.fatherId ?? 'none'}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Selecionar pai..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não informado</SelectItem>
                  {fathers.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.tag}{f.name ? ` · ${f.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Observações */}
            <FormField label="Observações" error={errors.observations?.message}>
              <Textarea
                {...register('observations')}
                placeholder="Informações adicionais sobre o animal..."
                className="resize-none text-base min-h-[80px]"
                style={{ fontSize: '16px' }}
              />
            </FormField>

          </div>
        )}
      </div>

      {/* ── Botão fixo no rodapé (mobile) ──────────────── */}
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
              {mode === 'create' ? 'Cadastrando...' : 'Salvando...'}
            </>
          ) : (
            <>
              {mode === 'create' ? (
                <>
                  <Camera className="size-5 mr-2" />
                  Cadastrar Animal
                </>
              ) : (
                'Salvar Alterações'
              )}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
