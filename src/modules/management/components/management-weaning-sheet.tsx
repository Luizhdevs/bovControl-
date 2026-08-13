'use client'

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { Baby, AlertTriangle, CheckCircle2, Scale } from 'lucide-react'
import { registerWeaning }   from '@/modules/animals/actions'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button }   from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label }    from '@/components/ui/label'
import { Input }    from '@/components/ui/input'
import { cn }       from '@/lib/utils'

interface ManagementWeaningSheetProps {
  open:       boolean
  onClose:    () => void
  animalId:   string
  animalTag:  string
  animalName: string | null
  ageDays:    number | null
  weightKg:   number | null
  sex:        string | null
}

export function ManagementWeaningSheet({
  open, onClose, animalId, animalTag, animalName, ageDays, weightKg, sex,
}: ManagementWeaningSheetProps) {
  const router  = useRouter()
  const today   = new Date().toISOString().slice(0, 10)

  const [date,    setDate]    = useState(today)
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const meetsAge    = ageDays !== null && ageDays >= 90
  const meetsWeight = weightKg !== null && weightKg >= 100
  const noWeight    = weightKg === null
  const canWean     = meetsAge && (meetsWeight || noWeight)

  const newCategory = sex === 'FEMALE' ? 'Novilha (HEIFER)' : 'Garrote (STEER)'

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await registerWeaning({ animalId, weanedAt: date, notes: notes || undefined })
    setLoading(false)
    if (!result.success) { setError(result.error ?? 'Erro desconhecido'); return }
    router.refresh()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Baby className="size-5" />
            Registrar Desmama
          </SheetTitle>
          <SheetDescription>
            {animalName ? `${animalTag} · ${animalName}` : animalTag}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Status do bezerro */}
          <div className="grid grid-cols-2 gap-2">
            <div className={cn(
              'rounded-lg border p-3 text-center',
              meetsAge ? 'border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800',
            )}>
              <div className="text-lg font-bold">{ageDays ?? '—'}</div>
              <div className="text-xs text-muted-foreground">dias de idade</div>
              <div className={cn('text-xs font-medium mt-0.5', meetsAge ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400')}>
                {meetsAge ? '✓ ≥ 90 dias' : `✗ faltam ${ageDays !== null ? 90 - ageDays : '?'} dias`}
              </div>
            </div>
            <div className={cn(
              'rounded-lg border p-3 text-center',
              noWeight ? 'border-zinc-200 bg-muted/40' : meetsWeight ? 'border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800' : 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800',
            )}>
              <div className="flex items-center justify-center gap-1">
                <Scale className="size-3.5 text-muted-foreground" />
                <div className="text-lg font-bold">{weightKg ?? '—'}</div>
              </div>
              <div className="text-xs text-muted-foreground">kg (último peso)</div>
              <div className={cn('text-xs font-medium mt-0.5',
                noWeight ? 'text-muted-foreground' : meetsWeight ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
              )}>
                {noWeight ? 'Sem registro' : meetsWeight ? '✓ ≥ 100 kg' : '✗ < 100 kg'}
              </div>
            </div>
          </div>

          {/* Aviso se abaixo do peso */}
          {!noWeight && !meetsWeight && (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>Bezerro abaixo do peso mínimo (100 kg). Registre uma pesagem antes de desmamar.</span>
            </div>
          )}

          {/* Info */}
          {canWean && (
            <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-300 flex items-start gap-2">
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              <span>Após a desmama, o bezerro será promovido para <strong>{newCategory}</strong>.</span>
            </div>
          )}

          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="wean-date">Data da desmama</Label>
            <Input
              id="wean-date"
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="wean-notes">Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="wean-notes"
              placeholder="Ex: desmamado por idade e peso suficiente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="size-4" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirm}
              disabled={loading || (!meetsAge)}
            >
              {loading ? 'Registrando...' : 'Confirmar Desmama'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
