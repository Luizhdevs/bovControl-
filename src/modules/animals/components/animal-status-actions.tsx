'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Loader2, DollarSign, AlertTriangle, ArrowRightLeft, RefreshCw } from 'lucide-react'
import {
  markAnimalAsSold,
  markAnimalAsDead,
  markAnimalAsTransferred,
  reactivateAnimal,
} from '../actions'

export type StatusChangeType = 'sold' | 'dead' | 'transferred' | null

// ─── Sold Sheet ───────────────────────────────────────────

function SoldSheet({
  animalId,
  open,
  onClose,
}: { animalId: string; open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [exitDate, setExitDate]   = useState(today)
  const [saleValue, setSaleValue] = useState('')
  const [buyer, setBuyer]         = useState('')
  const [isPending, start]        = useTransition()
  const { toast }                 = useToast()
  const router                    = useRouter()

  function handleSubmit() {
    start(async () => {
      const result = await markAnimalAsSold({
        animalId,
        exitDate,
        saleValue: saleValue ? parseFloat(saleValue.replace(',', '.')) : undefined,
        buyer:     buyer || undefined,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Registrado como vendido.' })
      onClose()
      router.push('/animals')
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="size-4 text-amber-500" />
            Registrar como Vendido
          </SheetTitle>
          <SheetDescription>
            O animal sairá do rebanho ativo. Fotos, registros e lote são mantidos.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sold-date">Data de saída *</Label>
            <Input
              id="sold-date"
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sold-buyer">Comprador (opcional)</Label>
            <Input
              id="sold-buyer"
              type="text"
              placeholder="Nome do comprador"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sold-value">Valor de venda — R$ (opcional)</Label>
            <Input
              id="sold-value"
              type="number"
              inputMode="decimal"
              placeholder="0,00"
              min={0}
              step="0.01"
              value={saleValue}
              onChange={(e) => setSaleValue(e.target.value)}
              className="h-11"
            />
          </div>
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending || !exitDate}
          >
            {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Confirmar Venda
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Dead Sheet ────────────────────────────────────────────

function DeadSheet({
  animalId,
  open,
  onClose,
}: { animalId: string; open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [exitDate, setExitDate] = useState(today)
  const [cause, setCause]       = useState('')
  const [isPending, start]      = useTransition()
  const { toast }               = useToast()
  const router                  = useRouter()

  function handleSubmit() {
    start(async () => {
      const result = await markAnimalAsDead({
        animalId,
        exitDate,
        cause: cause || undefined,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Óbito registrado.' })
      onClose()
      router.push('/animals')
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            Registrar Óbito
          </SheetTitle>
          <SheetDescription>
            O animal sairá do rebanho ativo. Todos os registros históricos são mantidos.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dead-date">Data do óbito *</Label>
            <Input
              id="dead-date"
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dead-cause">Causa mortis (opcional)</Label>
            <Input
              id="dead-cause"
              type="text"
              placeholder="Ex: Timpanismo, Acidose, Parto"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              className="h-11"
            />
          </div>
          <Button
            variant="destructive"
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending || !exitDate}
          >
            {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Confirmar Óbito
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Transferred Sheet ─────────────────────────────────────

function TransferredSheet({
  animalId,
  open,
  onClose,
}: { animalId: string; open: boolean; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [exitDate, setExitDate]       = useState(today)
  const [destination, setDestination] = useState('')
  const [isPending, start]            = useTransition()
  const { toast }                     = useToast()
  const router                        = useRouter()

  function handleSubmit() {
    start(async () => {
      const result = await markAnimalAsTransferred({
        animalId,
        exitDate,
        destination: destination || undefined,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Transferência registrada.' })
      onClose()
      router.push('/animals')
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-blue-500" />
            Registrar Transferência
          </SheetTitle>
          <SheetDescription>
            O animal sairá deste rebanho. Todos os registros históricos são mantidos.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transferred-date">Data de transferência *</Label>
            <Input
              id="transferred-date"
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transferred-dest">Destino (opcional)</Label>
            <Input
              id="transferred-dest"
              type="text"
              placeholder="Nome da fazenda ou proprietário"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="h-11"
            />
          </div>
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending || !exitDate}
          >
            {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Confirmar Transferência
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Compound: todos os sheets de mudança de status ────────

export function AnimalStatusActionsSheets({
  animalId,
  openType,
  onClose,
}: {
  animalId: string
  openType: StatusChangeType
  onClose:  () => void
}) {
  return (
    <>
      <SoldSheet
        animalId={animalId}
        open={openType === 'sold'}
        onClose={onClose}
      />
      <DeadSheet
        animalId={animalId}
        open={openType === 'dead'}
        onClose={onClose}
      />
      <TransferredSheet
        animalId={animalId}
        open={openType === 'transferred'}
        onClose={onClose}
      />
    </>
  )
}

// ─── Botão de reativação ───────────────────────────────────

export function ReactivateAnimalButton({
  animalId,
  animalStatus,
  userRole,
}: {
  animalId:    string
  animalStatus: 'SOLD' | 'DEAD' | 'TRANSFERRED'
  userRole:    string
}) {
  const [open, setOpen]    = useState(false)
  const [isPending, start] = useTransition()
  const { toast }          = useToast()
  const router             = useRouter()

  const isDeadReactivation = animalStatus === 'DEAD'
  const canReactivate      = isDeadReactivation
    ? userRole === 'OWNER'
    : ['OWNER', 'MANAGER'].includes(userRole)

  if (!canReactivate) return null

  function handleReactivate() {
    start(async () => {
      const result = await reactivateAnimal({ animalId })
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        setOpen(false)
        return
      }
      toast({ title: 'Animal reativado com sucesso.' })
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <RefreshCw className="size-3.5" />
        Reativar Animal
      </button>

      <Sheet open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="mb-5">
            <SheetTitle className="flex items-center gap-2">
              {isDeadReactivation && (
                <AlertTriangle className="size-4 text-amber-500" />
              )}
              Reativar Animal
            </SheetTitle>
            <SheetDescription>
              {isDeadReactivation
                ? 'Este animal tem óbito registrado. Reativar apagará a data e o motivo de saída. Confirme apenas se o registro foi feito por engano.'
                : 'O animal voltará ao rebanho ativo. A data e o motivo de saída serão removidos.'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3">
            <Button
              className="w-full h-12 text-base"
              variant={isDeadReactivation ? 'destructive' : 'default'}
              onClick={handleReactivate}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Confirmar Reativação
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
