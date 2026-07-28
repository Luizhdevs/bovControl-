'use client'

import { useTransition, useState } from 'react'
import { useRouter }    from 'next/navigation'
import { useToast }     from '@/hooks/use-toast'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { Label }        from '@/components/ui/label'
import { Textarea }     from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Loader2, AlertTriangle } from 'lucide-react'
import { registerAbortion } from '@/modules/animals/actions'

interface ManagementAbortionSheetProps {
  open:       boolean
  onClose:    () => void
  animalId:   string
  animalTag:  string
  animalName: string | null
}

export function ManagementAbortionSheet({
  open,
  onClose,
  animalId,
  animalTag,
  animalName,
}: ManagementAbortionSheetProps) {
  const router  = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const todayStr = new Date().toISOString().slice(0, 10)
  const [abortedAt, setAbortedAt] = useState(todayStr)
  const [notes,     setNotes]     = useState('')

  function handleClose() {
    if (isPending) return
    setAbortedAt(todayStr)
    setNotes('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await registerAbortion({
        animalId,
        abortedAt: new Date(abortedAt + 'T12:00:00'),
        notes:     notes.trim() || undefined,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title:       'Aborto registrado',
        description: `${animalTag}${animalName ? ` · ${animalName}` : ''} · evento de saúde criado`,
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
            <div className="size-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <SheetTitle className="text-base">Registrar Aborto</SheetTitle>
              <SheetDescription className="text-xs">
                {animalTag}{animalName ? ` · ${animalName}` : ''} · um evento de saúde será registrado
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="abortion-date">Data do aborto</Label>
            <Input
              id="abortion-date"
              type="date"
              value={abortedAt}
              onChange={e => setAbortedAt(e.target.value)}
              max={todayStr}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="abortion-notes">
              Observações{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="abortion-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: prenhez confirmada, sem causa aparente…"
              maxLength={300}
              rows={3}
              disabled={isPending}
              className="resize-none"
            />
          </div>

          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
            <p>• O evento será registrado no histórico de saúde.</p>
            <p>• Se a vaca estava seca gestante, o status volta para <strong>Seca</strong>.</p>
            <p>• Alertas de parto pendentes serão resolvidos automaticamente.</p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              disabled={isPending || !abortedAt}
            >
              {isPending
                ? <><Loader2 className="size-4 animate-spin mr-2" />Registrando…</>
                : <><AlertTriangle className="size-4 mr-2" />Confirmar Aborto</>
              }
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
