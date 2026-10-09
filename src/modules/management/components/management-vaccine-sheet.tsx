'use client'

import { useState, useTransition } from 'react'
import { Syringe, CheckCircle2 }   from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { applyVaccineAndResolveAlert } from '@/modules/alerts/actions'

interface ManagementVaccineSheetProps {
  open:        boolean
  onClose:     () => void
  alertId:     string
  animalId:    string
  animalTag:   string
  animalName:  string | null
  vaccineTitle: string
  farmId:      string
}

export function ManagementVaccineSheet({
  open, onClose, alertId, animalId, animalTag, animalName, vaccineTitle, farmId,
}: ManagementVaccineSheetProps) {
  const { toast }             = useToast()
  const [isPending, start]    = useTransition()
  const [done, setDone]       = useState(false)
  const todayStr              = new Date().toISOString().split('T')[0]!
  const [appliedAt, setAppliedAt] = useState(todayStr)

  function handleClose() {
    setDone(false)
    setAppliedAt(todayStr)
    onClose()
  }

  function handleApply() {
    start(async () => {
      const result = await applyVaccineAndResolveAlert(
        alertId, animalId, farmId, new Date(appliedAt),
      )
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      setDone(true)
    })
  }

  const label = animalName ? `${animalTag} · ${animalName}` : animalTag

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2">
            <Syringe className="size-4 text-emerald-500" />
            {vaccineTitle}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">{label}</p>
        </SheetHeader>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="size-12 text-emerald-500" />
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">Vacina registrada!</p>
            <p className="text-xs text-muted-foreground">
              Rotavec J5 + Tifopasteurina aplicadas em {label}.<br />
              Evento de saúde gerado e alerta resolvido.
            </p>
            <Button className="mt-2 w-full" onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <strong>Vacinas:</strong> Rotavec J5 + Tifopasteurina (ou Providean Enteroplus)
            </div>

            <div className="space-y-2">
              <Label htmlFor="applied-at">Data de aplicação</Label>
              <Input
                id="applied-at"
                type="date"
                value={appliedAt}
                max={todayStr}
                onChange={(e) => setAppliedAt(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-12 text-base gap-2"
              onClick={handleApply}
              disabled={isPending || !appliedAt}
            >
              <Syringe className="size-4" />
              {isPending ? 'Registrando…' : 'Confirmar aplicação'}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
