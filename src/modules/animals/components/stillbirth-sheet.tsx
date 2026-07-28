'use client'

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import { AlertTriangle, Baby } from 'lucide-react'
import { registerStillbirth }  from '@/modules/animals/actions'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button }    from '@/components/ui/button'
import { Textarea }  from '@/components/ui/textarea'
import { Label }     from '@/components/ui/label'

interface StillbirthSheetProps {
  open:       boolean
  onClose:    () => void
  animalId:   string
  animalTag:  string
  animalName: string | null
  calveId:    string
  calveTag:   string
}

export function StillbirthSheet({
  open, onClose, animalId, animalTag, animalName, calveId, calveTag,
}: StillbirthSheetProps) {
  const router   = useRouter()
  const [notes,   setNotes]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await registerStillbirth({ animalId, calveId, notes: notes || undefined })
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? 'Erro desconhecido')
      return
    }
    router.refresh()
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-red-600">
            <Baby className="size-5" />
            Registrar Natimorto
          </SheetTitle>
          <SheetDescription>
            {animalName ? `${animalTag} · ${animalName}` : animalTag}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Info */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 space-y-1 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300">
            <p className="font-semibold">O que será feito:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Bezerro <span className="font-mono font-bold">{calveTag}</span> marcado como morto (natimorto)</li>
              <li>Evento de saúde "Natimorto" registrado no histórico da mãe</li>
              <li>Contagem de partos corrigida</li>
              <li>Status reprodutivo da mãe atualizado para vazia</li>
            </ul>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="notes"
              placeholder="Ex: bezerro nasceu sem vida, parto prematuro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="size-4" /> {error}
            </p>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Confirmar Natimorto'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
