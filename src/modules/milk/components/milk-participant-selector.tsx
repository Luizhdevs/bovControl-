'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Users, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Button }                  from '@/components/ui/button'
import { registerSessionParticipants } from '../actions'
import type { ProductionLotAnimal }    from '../queries'

interface Props {
  sessionId:   string
  farmId:      string
  totalLiters: number
  animals:     ProductionLotAnimal[]
  lotName:     string | null
  initialParticipantIds?: string[]
}

export function MilkParticipantSelector({
  sessionId, farmId, totalLiters, animals, lotName, initialParticipantIds = [],
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set(initialParticipantIds))
  const [error, setError]       = useState<string | null>(null)
  const [saved, setSaved]       = useState(false)

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setSaved(false)
  }

  const toggleAll = () => {
    if (selected.size === animals.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(animals.map((a) => a.id)))
    }
    setSaved(false)
  }

  const litersPerCow = selected.size > 0 ? totalLiters / selected.size : 0

  async function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await registerSessionParticipants(
        sessionId,
        farmId,
        Array.from(selected),
        totalLiters,
      )
      if (!result.success) {
        setError(result.error)
      } else {
        setSaved(true)
        router.refresh()
      }
    })
  }

  if (animals.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Nenhum lote de produção configurado.{' '}
        <span className="text-primary">Configure em Configurações → Parâmetros Gerais.</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4 text-primary" />
          {lotName ?? 'Lote de Produção'}
          <span className="text-xs font-normal text-muted-foreground">
            {selected.size}/{animals.length} selecionadas
          </span>
        </div>
        <button
          onClick={toggleAll}
          className="text-xs text-primary hover:underline"
          disabled={isPending}
        >
          {selected.size === animals.length ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      {/* Média estimada */}
      {selected.size > 0 && (
        <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-xs text-center">
          <span className="text-cyan-400 font-bold tabular-nums">
            {litersPerCow.toFixed(1)} L
          </span>
          <span className="text-muted-foreground"> estimado por vaca ({selected.size} participantes)</span>
        </div>
      )}

      {/* Lista de vacas */}
      <div className="max-h-64 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-card">
        {animals.map((animal) => {
          const isSelected = selected.has(animal.id)
          return (
            <button
              key={animal.id}
              onClick={() => toggle(animal.id)}
              disabled={isPending}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}
              `}
            >
              {isSelected
                ? <CheckSquare className="size-4 text-primary shrink-0" />
                : <Square className="size-4 text-muted-foreground shrink-0" />
              }
              <span className="text-xs font-medium tabular-nums">{animal.tag}</span>
              {animal.name && (
                <span className="text-xs text-muted-foreground truncate">{animal.name}</span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
      {saved && (
        <p className="text-xs text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2">
          Participantes salvos com sucesso.
        </p>
      )}

      <Button
        onClick={handleSave}
        disabled={isPending || selected.size === 0}
        className="w-full gap-2"
        size="sm"
      >
        {isPending && <Loader2 className="size-3 animate-spin" />}
        {isPending ? 'Salvando…' : `Confirmar ${selected.size} participante${selected.size !== 1 ? 's' : ''}`}
      </Button>
    </div>
  )
}
