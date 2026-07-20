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
import { Loader2, Baby } from 'lucide-react'
import { cn } from '@/lib/utils'
import { registerCalving } from '@/modules/animals/actions'

interface ManagementCalvingSheetProps {
  open:       boolean
  onClose:    () => void
  animalId:   string
  animalTag:  string
  animalName: string | null
}

export function ManagementCalvingSheet({
  open,
  onClose,
  animalId,
  animalTag,
  animalName,
}: ManagementCalvingSheetProps) {
  const router           = useRouter()
  const { toast }        = useToast()
  const [isPending, startTransition] = useTransition()

  const todayStr = new Date().toISOString().slice(0, 10)
  const [birthDate, setBirthDate] = useState(todayStr)
  const [calveSex,  setCalveSex]  = useState<'MALE' | 'FEMALE'>('FEMALE')
  const [calveName, setCalveName] = useState('')

  function handleClose() {
    if (isPending) return
    setBirthDate(todayStr)
    setCalveSex('FEMALE')
    setCalveName('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await registerCalving({
        animalId,
        birthDate: new Date(birthDate + 'T12:00:00'),
        calveSex,
        calveName: calveName.trim() || undefined,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title:       'Parto registrado!',
        description: `Bezerro ${result.calveTag} criado e vinculado a ${animalTag}`,
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
            <div className="size-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Baby className="size-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <SheetTitle className="text-base">Registrar Parto</SheetTitle>
              <SheetDescription className="text-xs">
                {animalTag}{animalName ? ` · ${animalName}` : ''} · bezerro será criado automaticamente
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sexo do bezerro */}
          <div className="space-y-1.5">
            <Label>Sexo do bezerro</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'FEMALE' as const, label: 'Fêmea ♀' },
                { value: 'MALE'   as const, label: 'Macho ♂' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCalveSex(opt.value)}
                  disabled={isPending}
                  className={cn(
                    'rounded-xl border py-3 text-sm font-semibold transition-all',
                    calveSex === opt.value
                      ? opt.value === 'FEMALE'
                        ? 'border-pink-500 bg-pink-500/10 text-pink-500'
                        : 'border-sky-500 bg-sky-500/10 text-sky-500'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data do parto */}
          <div className="space-y-1.5">
            <Label htmlFor="calving-date">Data do parto</Label>
            <Input
              id="calving-date"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={todayStr}
              required
              disabled={isPending}
            />
          </div>

          {/* Nome do bezerro */}
          <div className="space-y-1.5">
            <Label htmlFor="calving-name">
              Nome do bezerro{' '}
              <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="calving-name"
              value={calveName}
              onChange={e => setCalveName(e.target.value)}
              placeholder="Ex: Pintada, Formosa…"
              maxLength={60}
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
              disabled={isPending || !birthDate}
            >
              {isPending
                ? <><Loader2 className="size-4 animate-spin mr-2" />Registrando…</>
                : <><Baby className="size-4 mr-2" />Registrar Parto</>
              }
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
