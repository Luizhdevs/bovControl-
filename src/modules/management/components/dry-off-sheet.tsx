'use client'

import { useTransition, useState } from 'react'
import { useRouter }    from 'next/navigation'
import { useToast }     from '@/hooks/use-toast'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Label }        from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Droplets, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registerDryOff, getLotsForDryOff } from '@/modules/animals/actions'

// ─── Tipos ─────────────────────────────────────────────────

interface DryOffSheetProps {
  open:       boolean
  onClose:    () => void
  animalId:   string
  animalTag:  string
  animalName: string | null
}

type LotOption = { id: string; name: string; type: string }

const LOT_TYPE_LABELS: Record<string, string> = {
  LACTATING: 'Lactação',
  DRY:       'Secas',
  MATERNITY: 'Maternidade',
  BREEDING:  'Reprodução',
  GENERAL:   'Geral',
}

// ─── Componente ────────────────────────────────────────────

export function DryOffSheet({
  open,
  onClose,
  animalId,
  animalTag,
  animalName,
}: DryOffSheetProps) {
  const router           = useRouter()
  const { toast }        = useToast()
  const [isPending, startTransition] = useTransition()

  const todayStr = new Date().toISOString().slice(0, 10)
  const [date,         setDate]         = useState(todayStr)
  const [notes,        setNotes]        = useState('')
  const [changeLot,    setChangeLot]    = useState(false)
  const [lots,         setLots]         = useState<LotOption[]>([])
  const [lotsLoading,  setLotsLoading]  = useState(false)
  const [lotId,        setLotId]        = useState<string | null>(null)

  function handleClose() {
    if (isPending) return
    setDate(todayStr)
    setNotes('')
    setChangeLot(false)
    setLots([])
    setLotId(null)
    onClose()
  }

  async function handleToggleLot(checked: boolean) {
    setChangeLot(checked)
    if (checked && lots.length === 0) {
      setLotsLoading(true)
      try {
        const fetched = await getLotsForDryOff()
        setLots(fetched)
      } finally {
        setLotsLoading(false)
      }
    }
    if (!checked) setLotId(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await registerDryOff({
        animalId,
        driedOffAt: new Date(date + 'T12:00:00'),
        notes:      notes.trim() || undefined,
        lotId:      changeLot ? lotId : undefined,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title:       'Secagem registrada',
        description: `${animalTag}${animalName ? ` · ${animalName}` : ''} marcada como seca`,
      })

      router.refresh()
      handleClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Droplets className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <SheetTitle className="text-base">Registrar Secagem</SheetTitle>
              <SheetDescription className="text-xs">
                {animalTag}{animalName ? ` · ${animalName}` : ''}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="dry-date">Data de secagem</Label>
            <Input
              id="dry-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              max={todayStr}
              required
              disabled={isPending}
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="dry-notes">
              Observações{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="dry-notes"
              placeholder="ex: tratamento de vaca seca aplicado"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={300}
              disabled={isPending}
            />
          </div>

          {/* Trocar lote */}
          <div className="rounded-xl border border-border p-3 space-y-3">
            <button
              type="button"
              onClick={() => handleToggleLot(!changeLot)}
              disabled={isPending}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">Mover para lote de secas?</span>
              </div>
              {/* Toggle visual */}
              <div className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                changeLot ? 'bg-amber-500' : 'bg-muted-foreground/30',
              )}>
                <span className={cn(
                  'pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform',
                  changeLot ? 'translate-x-4' : 'translate-x-0',
                )} />
              </div>
            </button>

            {changeLot && (
              <div className="space-y-1.5">
                <Label htmlFor="dry-lot">Lote de destino</Label>
                {lotsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="size-4 animate-spin" />
                    Carregando lotes…
                  </div>
                ) : (
                  <Select
                    value={lotId ?? ''}
                    onValueChange={v => setLotId(v || null)}
                    disabled={isPending}
                  >
                    <SelectTrigger id="dry-lot">
                      <SelectValue placeholder="Selecione o lote" />
                    </SelectTrigger>
                    <SelectContent>
                      {lots.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.name}
                          {lot.type && (
                            <span className="text-muted-foreground ml-1.5 text-xs">
                              · {LOT_TYPE_LABELS[lot.type] ?? lot.type}
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isPending || !date || (changeLot && !lotId)}
            >
              {isPending
                ? <><Loader2 className="size-4 animate-spin mr-2" />Salvando…</>
                : 'Confirmar secagem'
              }
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
