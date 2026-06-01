'use client'

/**
 * Botão + Sheet de registro rápido de ordenha.
 * Single-step: turno → total de litros → vacas ordenhadas.
 * Mínimo de toques, funciona offline.
 */

import { useState, useEffect, useTransition, useRef } from 'react'
import { Plus, MilkIcon, Loader2, CheckCircle2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Input }    from '@/components/ui/input'
import { Button }   from '@/components/ui/button'
import { Label }    from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useMilkQueue }        from '@/stores/milk-queue'
import { registerMilkingSession } from '../actions'
import { getDefaultShift, MilkShiftTabs } from './milk-shift-tabs'
import { format } from 'date-fns'

// ─── Props ─────────────────────────────────────────────────────

interface MilkQuickRegisterProps {
  farmId: string
}

// ─── Componente ────────────────────────────────────────────────

export function MilkQuickRegister({ farmId }: MilkQuickRegisterProps) {
  const [open, setOpen]       = useState(false)
  const [shift, setShift]     = useState<'MORNING' | 'AFTERNOON'>('MORNING')
  const [liters, setLiters]   = useState('')
  const [cows, setCows]       = useState('')
  const [isPending, start]    = useTransition()
  const { toast }             = useToast()
  const { add: addToQueue }   = useMilkQueue()
  const litersInputRef        = useRef<HTMLInputElement>(null)

  // Aplica o turno local após a montagem (evita hydration mismatch)
  useEffect(() => {
    setShift(getDefaultShift())
  }, [])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) {
      setLiters('')
      setCows('')
      setShift(getDefaultShift())
    }
  }

  function handleSubmit() {
    const totalLiters = parseFloat(liters.replace(',', '.'))
    const milkingCows = parseInt(cows, 10)

    if (isNaN(totalLiters) || totalLiters <= 0) {
      toast({ title: 'Produção inválida', variant: 'destructive' })
      return
    }
    if (isNaN(milkingCows) || milkingCows <= 0) {
      toast({ title: 'Número de vacas inválido', variant: 'destructive' })
      return
    }

    const today = format(new Date(), 'yyyy-MM-dd')

    start(async () => {
      const result = await registerMilkingSession(farmId, {
        shift,
        date:        new Date(),
        totalLiters,
        milkingCows,
      })

      if (result.success) {
        toast({ title: `${totalLiters}L registrado — ${milkingCows} vacas` })
        handleOpenChange(false)
        return
      }

      if (result.kind === 'network') {
        addToQueue({
          farmId,
          shift,
          date:           today,
          totalLiters,
          milkingCows,
          notes:          null,
          participantIds: null,
        })
        toast({
          title:       'Salvo offline',
          description: 'Será enviado quando a conexão voltar.',
        })
        handleOpenChange(false)
        return
      }

      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
    })
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="w-full h-13 text-base font-semibold gap-2"
      >
        <Plus className="size-5" />
        Registrar Ordenha
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <MilkIcon className="size-5 text-cyan-400" />
              Registrar Ordenha
            </SheetTitle>
            <SheetDescription>
              Total de litros e vacas ordenhadas neste turno.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {/* Turno */}
            <div className="space-y-2">
              <Label>Turno</Label>
              <MilkShiftTabs value={shift} onChange={setShift} disabled={isPending} />
            </div>

            {/* Total de litros */}
            <div className="space-y-2">
              <Label>Total produzido (litros)</Label>
              <div className="relative">
                <Input
                  ref={litersInputRef}
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  step="0.1"
                  min="0.1"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="h-20 text-4xl text-center font-bold pr-14"
                  style={{ fontSize: '36px' }}
                  autoComplete="off"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-muted-foreground font-medium">
                  L
                </span>
              </div>
            </div>

            {/* Vacas ordenhadas */}
            <div className="space-y-2">
              <Label>Vacas ordenhadas</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  step="1"
                  min="1"
                  value={cows}
                  onChange={(e) => setCows(e.target.value)}
                  className="h-14 text-2xl text-center font-bold pr-16"
                  style={{ fontSize: '24px' }}
                  autoComplete="off"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  vacas
                </span>
              </div>
              {liters && cows && parseFloat(liters) > 0 && parseInt(cows) > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Média: {(parseFloat(liters.replace(',', '.')) / parseInt(cows)).toFixed(1)} L/vaca
                </p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !liters || !cows}
              className="w-full h-13 text-base font-semibold"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-5 animate-spin mr-2" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5 mr-2" />
                  Confirmar Ordenha
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
