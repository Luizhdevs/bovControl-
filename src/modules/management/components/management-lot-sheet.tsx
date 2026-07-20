'use client'

import { useTransition, useState } from 'react'
import { useRouter }    from 'next/navigation'
import { useToast }     from '@/hooks/use-toast'
import { Button }       from '@/components/ui/button'
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
import { Loader2, Layers2 } from 'lucide-react'
import { transferLotFromSession, getLotsForDryOff } from '@/modules/animals/actions'

interface ManagementLotSheetProps {
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

export function ManagementLotSheet({
  open,
  onClose,
  animalId,
  animalTag,
  animalName,
}: ManagementLotSheetProps) {
  const router           = useRouter()
  const { toast }        = useToast()
  const [isPending, startTransition] = useTransition()

  const [lots,        setLots]        = useState<LotOption[]>([])
  const [lotsLoaded,  setLotsLoaded]  = useState(false)
  const [lotsLoading, setLotsLoading] = useState(false)
  const [lotId,       setLotId]       = useState<string>('')

  async function handleOpen(isOpen: boolean) {
    if (isOpen && !lotsLoaded) {
      setLotsLoading(true)
      try {
        const fetched = await getLotsForDryOff()
        setLots(fetched)
        setLotsLoaded(true)
      } finally {
        setLotsLoading(false)
      }
    }
    if (!isOpen) handleClose()
  }

  function handleClose() {
    if (isPending) return
    setLotId('')
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lotId) return
    startTransition(async () => {
      const result = await transferLotFromSession({ animalId, lotId })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({
        title:       'Lote atualizado',
        description: `${animalTag}${animalName ? ` · ${animalName}` : ''} transferido com sucesso`,
      })

      router.refresh()
      handleClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Layers2 className="size-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base">Definir Lote</SheetTitle>
              <SheetDescription className="text-xs">
                {animalTag}{animalName ? ` · ${animalName}` : ''}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mgmt-lot">Lote de destino</Label>
            {lotsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <Loader2 className="size-4 animate-spin" />
                Carregando lotes…
              </div>
            ) : (
              <Select value={lotId} onValueChange={setLotId} disabled={isPending}>
                <SelectTrigger id="mgmt-lot">
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

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending || !lotId}>
              {isPending
                ? <><Loader2 className="size-4 animate-spin mr-2" />Salvando…</>
                : 'Confirmar lote'
              }
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
