'use client'

import { useTransition, useState } from 'react'
import { Button }   from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { saveBreedingGoal } from '../actions'
import type { GoalWeights } from '../types'

interface BreedingGoalFormProps {
  farmId:    string
  initial:   GoalWeights
  onSuccess?: () => void
}

const TRAITS = [
  { key: 'wLeite'      as const, label: 'Produção de leite',    desc: 'kg/lactação, gordura, proteína' },
  { key: 'wGanho'      as const, label: 'Crescimento',          desc: 'peso ao desmame e sobreano'     },
  { key: 'wParto'      as const, label: 'Facilidade de parto',  desc: 'menos intervenção no parto'    },
  { key: 'wCcs'        as const, label: 'Saúde do úbere (CCS)', desc: 'contagem de células somáticas' },
  { key: 'wConformacao'as const, label: 'Conformação / frame',  desc: 'estrutura corporal'            },
]

export function BreedingGoalForm({ farmId, initial, onSuccess }: BreedingGoalFormProps) {
  const [isPending, start] = useTransition()
  const { toast }          = useToast()
  const [weights, setWeights] = useState<GoalWeights>({ ...initial })

  const total = Object.values(weights).reduce((s, v) => s + v, 0)

  const set = (key: keyof GoalWeights, val: number) =>
    setWeights(prev => ({ ...prev, [key]: Math.max(0, Math.min(100, val)) }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      const result = await saveBreedingGoal(farmId, weights)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Metas salvas' })
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Defina a importância de cada característica para a seleção genética da sua fazenda.
        Os pesos são usados para calcular o score de cada touro.
      </p>

      {TRAITS.map(({ key, label, desc }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted-foreground ml-2">{desc}</span>
            </div>
            <span className="text-sm font-bold tabular-nums w-10 text-right">{weights[key]}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={weights[key]}
            onChange={e => set(key, Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      ))}

      <div className="flex items-center justify-between pt-2 border-t border-border/40">
        <span className="text-xs text-muted-foreground">
          Soma total dos pesos: <span className={total > 100 ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>{total}</span>
          <span className="text-muted-foreground/60"> (referência: 100)</span>
        </span>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Salvando…' : 'Salvar metas'}
        </Button>
      </div>
    </form>
  )
}
