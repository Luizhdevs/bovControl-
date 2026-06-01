'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter }     from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver }   from '@hookform/resolvers/zod'
import { useToast }      from '@/hooks/use-toast'
import { useMilkQueue }  from '@/stores/milk-queue'
import { registerMilkingSessionWithParticipants } from '../actions'
import { milkingSessionSchema, type MilkingSessionInput } from '../schema'
import { getDefaultShift, MilkShiftTabs } from './milk-shift-tabs'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Label }    from '@/components/ui/label'
import { MilkIcon, Loader2, WifiOff, CheckSquare, Square, Users, Search } from 'lucide-react'
import { format }   from 'date-fns'
import type { ProductionLotAnimal } from '../queries'

// ─── Input de litros com formato brasileiro ─────────────────────
// Armazena centésimos internamente — exibe "0,00" sempre com 2 casas

function LitersInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // Converte float → centésimos → string formatada
  const [raw, setRaw] = useState(() => Math.round((value || 0) * 100).toString())

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')           // só dígitos
    const clamped = digits.slice(-7)                            // max 99999,99
    setRaw(clamped || '0')
    onChange(parseInt(clamped || '0', 10) / 100)
  }

  // "1234" → "12,34"
  const display = (() => {
    const n = parseInt(raw || '0', 10)
    const reais = Math.floor(n / 100)
    const cents = n % 100
    return `${reais.toLocaleString('pt-BR')},${String(cents).padStart(2, '0')}`
  })()

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className="w-full h-20 text-4xl text-center font-bold pr-14 tabular-nums rounded-md border border-input bg-background px-3 focus:outline-none focus:ring-2 focus:ring-ring"
        style={{ fontSize: '36px' }}
        autoComplete="off"
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">L</span>
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────

interface MilkRegisterFormProps {
  farmId:           string
  redirectTo?:      string
  productionAnimals: ProductionLotAnimal[]
  lotName:          string | null
  enableParticipants: boolean
}

// ─── Componente ────────────────────────────────────────────────

export function MilkRegisterForm({
  farmId,
  redirectTo = '/milk',
  productionAnimals,
  lotName,
  enableParticipants,
}: MilkRegisterFormProps) {
  const router              = useRouter()
  const { toast }           = useToast()
  const { add: addToQueue } = useMilkQueue()
  const [isPending, start]  = useTransition()

  // Participantes — todos selecionados por padrão
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(productionAnimals.map((a) => a.id)),
  )
  const [search, setSearch] = useState('')

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
      shift:       'MORNING',
      date:        new Date(),
      milkingCows: productionAnimals.length || undefined,
    },
  })

  useEffect(() => {
    setValue('shift', getDefaultShift())
  }, [setValue])

  const shift       = watch('shift')
  const totalLiters = watch('totalLiters')

  const participantCount = enableParticipants ? selected.size : (watch('milkingCows') ?? 0)
  const avgPerCow = totalLiters > 0 && participantCount > 0
    ? (totalLiters / participantCount).toFixed(1)
    : null

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    // Sync milkingCows com seleção
    const newCount = selected.has(id) ? selected.size - 1 : selected.size + 1
    setValue('milkingCows', newCount > 0 ? newCount : 1)
  }

  function toggleAll() {
    if (selected.size === productionAnimals.length) {
      setSelected(new Set())
      setValue('milkingCows', 1)
    } else {
      const all = new Set(productionAnimals.map((a) => a.id))
      setSelected(all)
      setValue('milkingCows', productionAnimals.length)
    }
  }

  async function onSubmit(data: MilkingSessionInput) {
    start(async () => {
      const animalIds = enableParticipants ? Array.from(selected) : undefined

      const result = await registerMilkingSessionWithParticipants(farmId, data, animalIds)

      if (result.success) {
        toast({ title: `Ordenha registrada — ${data.totalLiters}L`, description: animalIds ? `${animalIds.length} participantes` : undefined })
        router.push(redirectTo)
        return
      }

      if (result.kind === 'network') {
        addToQueue({
          farmId,
          shift:           data.shift,
          date:            format(data.date, 'yyyy-MM-dd'),
          totalLiters:     data.totalLiters,
          milkingCows:     animalIds?.length ?? data.milkingCows,
          notes:           data.notes || null,
          participantIds:  animalIds ?? null,
        })
        toast({ title: 'Salvo offline', description: 'Será enviado quando a conexão for restabelecida.' })
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
        {errors.shift && <p className="text-xs text-destructive">{errors.shift.message}</p>}
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
              value={field.value instanceof Date ? format(field.value, 'yyyy-MM-dd') : String(field.value ?? '')}
              onChange={(e) => field.onChange(new Date(e.target.value + 'T12:00:00'))}
              className="h-11 text-sm"
              style={{ fontSize: '16px' }}
            />
          )}
        />
        {errors.date && <p className="text-xs text-destructive">{String(errors.date.message)}</p>}
      </div>

      {/* ── Total de litros ───────────────────────────────── */}
      <div className="space-y-2">
        <Label>Total produzido (litros) *</Label>
        <Controller
          name="totalLiters"
          control={control}
          render={({ field }) => (
            <LitersInput
              value={field.value ?? 0}
              onChange={field.onChange}
            />
          )}
        />
        {errors.totalLiters && <p className="text-xs text-destructive">{errors.totalLiters.message}</p>}
      </div>

      {/* ── Participantes (lote de produção) ──────────────── */}
      {enableParticipants && productionAnimals.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5">
              <Users className="size-4 text-primary" />
              {lotName ?? 'Lote de Produção'}
              <span className="font-normal text-muted-foreground text-xs ml-1">
                {selected.size}/{productionAnimals.length}
              </span>
            </Label>
            <button type="button" onClick={toggleAll} className="text-xs text-primary hover:underline">
              {selected.size === productionAnimals.length ? 'Desmarcar todas' : 'Marcar todas'}
            </button>
          </div>

          {avgPerCow && (
            <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-xs text-center">
              <span className="text-cyan-400 font-bold tabular-nums">{avgPerCow} L</span>
              <span className="text-muted-foreground"> estimado/vaca · {selected.size} participantes</span>
            </div>
          )}

          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por brinco ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-card [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
            {productionAnimals.filter((a) => {
              if (!search) return true
              const q = search.toLowerCase()
              return a.tag.toLowerCase().includes(q) || (a.name?.toLowerCase().includes(q) ?? false)
            }).map((animal) => {
              const isSelected = selected.has(animal.id)
              return (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => toggleAnimal(animal.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  {isSelected
                    ? <CheckSquare className="size-4 text-primary shrink-0" />
                    : <Square className="size-4 text-muted-foreground shrink-0" />
                  }
                  <span className="text-xs font-mono font-medium">{animal.tag}</span>
                  {animal.name && <span className="text-xs text-muted-foreground truncate">{animal.name}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ) : !enableParticipants ? (
        /* Campo manual quando participantes desabilitado */
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
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">vacas</span>
          </div>
          {avgPerCow && <p className="text-center text-xs text-muted-foreground">Média: {avgPerCow} L/vaca</p>}
          {errors.milkingCows && <p className="text-xs text-destructive">{errors.milkingCows.message}</p>}
        </div>
      ) : null}

      {enableParticipants && productionAnimals.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground text-center">
          Nenhum lote de produção configurado.{' '}
          <a href="/settings" className="text-primary underline">Configurar em Parâmetros Gerais.</a>
        </div>
      )}

      {/* ── Observações ───────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Observações (opcional)</Label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Anotações sobre a ordenha..."
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── Submit fixo no rodapé ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur border-t border-border p-4">
        <Button
          type="submit"
          disabled={isPending || (enableParticipants && selected.size === 0)}
          className="w-full h-13 text-base font-semibold"
        >
          {isPending ? (
            <><Loader2 className="size-5 animate-spin mr-2" />Registrando...</>
          ) : (
            <><MilkIcon className="size-5 mr-2" />Registrar Ordenha</>
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
