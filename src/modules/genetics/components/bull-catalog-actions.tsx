'use client'

import { useState, useTransition } from 'react'
import { Button }  from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Plus, Pencil, Archive } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { BullForm } from './bull-form'
import { deactivateBull } from '../actions'
import type { BullForMatch } from '../types'

// ─── Botão de cadastrar novo touro ────────────────────────

export function AddBullButton({ farmId }: { farmId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1.5" />
          Cadastrar touro
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Novo touro / sêmen</SheetTitle>
        </SheetHeader>
        <BullForm farmId={farmId} onSuccess={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

// ─── Botão de editar touro ────────────────────────────────

export function EditBullButton({ farmId, bull }: { farmId: string; bull: BullForMatch }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Pencil className="size-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>Editar — {bull.bullName}</SheetTitle>
        </SheetHeader>
        <BullForm farmId={farmId} bull={bull} onSuccess={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

// ─── Botão arquivar touro ─────────────────────────────────

export function ArchiveBullButton({ farmId, bull }: { farmId: string; bull: BullForMatch }) {
  const [isPending, start] = useTransition()
  const { toast }          = useToast()

  const handleArchive = () => {
    start(async () => {
      const result = await deactivateBull(farmId, bull.id)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: `${bull.bullName} arquivado` })
    })
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
      onClick={handleArchive}
      disabled={isPending}
      title="Arquivar touro"
    >
      <Archive className="size-3.5" />
    </Button>
  )
}
