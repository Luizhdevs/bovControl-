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
import { Loader2, Droplets } from 'lucide-react'
import { registerDryOff } from '@/modules/animals/actions'

// ─── Tipos ─────────────────────────────────────────────────

interface DryOffSheetProps {
  open:       boolean
  onClose:    () => void
  animalId:   string
  animalTag:  string
  animalName: string | null
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
  const [date, setDate]   = useState(todayStr)
  const [notes, setNotes] = useState('')

  function handleClose() {
    if (isPending) return
    setDate(todayStr)
    setNotes('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await registerDryOff({
        animalId,
        driedOffAt: new Date(date + 'T12:00:00'),
        notes:      notes.trim() || undefined,
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
      <SheetContent side="bottom" className="rounded-t-2xl">
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

          <div className="space-y-1.5">
            <Label htmlFor="dry-notes">Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="dry-notes"
              placeholder="ex: tratamento de vaca seca aplicado"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              maxLength={300}
              disabled={isPending}
            />
          </div>

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
              disabled={isPending || !date}
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
