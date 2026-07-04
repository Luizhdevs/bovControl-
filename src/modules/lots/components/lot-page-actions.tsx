'use client'

import { useState, useTransition }          from 'react'
import { useRouter }                         from 'next/navigation'
import { Edit2, Plus, PowerOff, Trash2 }    from 'lucide-react'
import { useToast }                           from '@/hooks/use-toast'
import { MobileBottomActions }               from '@/components/shared/mobile-bottom-actions'
import { TransferAnimalDialog }              from './transfer-animal-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
}                                            from '@/components/ui/alert-dialog'
import { deactivateLot, deleteLot }          from '../actions'
import type { AnimalInLot, LotWithDetails }  from '../types'

interface LotPageActionsProps {
  lot:              Pick<LotWithDetails, 'id' | 'name' | 'type' | 'isActive'>
  farmId:           string
  availableAnimals: AnimalInLot[]
  userRole:         string
  animalCount:      number
}

export function LotPageActions({
  lot,
  farmId,
  availableAnimals,
  userRole,
  animalCount,
}: LotPageActionsProps) {
  const router                              = useRouter()
  const { toast }                           = useToast()
  const [dialogOpen, setDialogOpen]         = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen]         = useState(false)
  const [isPending, startTransition]        = useTransition()

  const canManage  = ['OWNER', 'MANAGER'].includes(userRole)
  const canDelete  = animalCount === 0
  const hasActions = lot.isActive || (canManage && canDelete)

  function handleDeactivate() {
    startTransition(async () => {
      const result = await deactivateLot(lot.id, farmId)
      if (result.success) {
        toast({ title: 'Lote desativado com sucesso.' })
        router.push('/lots')
      } else {
        toast({ title: result.error ?? 'Erro ao desativar lote.', variant: 'destructive' })
      }
      setDeactivateOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLot(lot.id, farmId)
      if (result.success) {
        toast({ title: 'Lote excluído com sucesso.' })
        router.push('/lots')
      } else {
        toast({ title: result.error ?? 'Erro ao excluir lote.', variant: 'destructive' })
      }
      setDeleteOpen(false)
    })
  }

  return (
    <>
      {/* Barra fixa de ações do rodapé */}
      {hasActions && <MobileBottomActions
        primary={
          lot.isActive
            ? [
                {
                  label:   'Editar Lote',
                  icon:    Edit2,
                  href:    `/lots/${lot.id}/edit`,
                  variant: 'outline',
                },
                {
                  label:    'Adicionar Animal',
                  icon:     Plus,
                  onClick:  () => setDialogOpen(true),
                  disabled: !canManage || availableAnimals.length === 0,
                  disabledReason: availableAnimals.length === 0
                    ? 'Todos os animais já estão neste lote'
                    : undefined,
                },
              ]
            : []
        }
        secondary={
          canManage
            ? [
                ...(lot.isActive
                  ? [
                      {
                        label:   animalCount > 0
                          ? `Desativar (${animalCount} animal${animalCount !== 1 ? 'is' : ''} no lote)`
                          : 'Desativar Lote',
                        icon:    PowerOff,
                        onClick: () => setDeactivateOpen(true),
                        variant: 'outline' as const,
                      },
                    ]
                  : []),
                ...(canDelete
                  ? [
                      {
                        label:   'Excluir Lote',
                        icon:    Trash2,
                        onClick: () => setDeleteOpen(true),
                        variant: 'destructive' as const,
                      },
                    ]
                  : []),
              ]
            : []
        }
      />}

      {/* Dialog: transferência de animal */}
      <TransferAnimalDialog
        farmId={farmId}
        targetLotId={lot.id}
        targetLotName={lot.name}
        targetLotType={lot.type}
        availableAnimals={availableAnimals}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      {/* Dialog: confirmar desativação */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar lote?</AlertDialogTitle>
            <AlertDialogDescription>
              {animalCount > 0
                ? `Este lote possui ${animalCount} animal${animalCount !== 1 ? 'is' : ''}. Você deve remover todos os animais antes de desativar o lote.`
                : `O lote "${lot.name}" será desativado e não aparecerá mais nas listagens ativas. Esta ação pode ser revertida pelo suporte.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            {animalCount === 0 && (
              <AlertDialogAction
                onClick={handleDeactivate}
                disabled={isPending}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isPending ? 'Desativando...' : 'Desativar'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: confirmar exclusão permanente */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lote permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              O lote <span className="font-semibold text-foreground">"{lot.name}"</span> será
              excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
