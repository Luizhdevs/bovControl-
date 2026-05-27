'use client'

import { useTransition } from 'react'
import { useToast }      from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Trash2 }        from 'lucide-react'
import { deleteAnimalPhoto } from '../actions'

interface PhotoDeleteButtonProps {
  photoId:  string
  farmId:   string
  /** Fecha o sheet/lightbox pai se necessário */
  onDeleted?: () => void
}

/**
 * Botão de exclusão de foto com confirmação.
 * Usado dentro da timeline e no lightbox de foto ampliada.
 * Só é renderizado quando `canDelete` é verdadeiro (OWNER ou MANAGER).
 */
export function PhotoDeleteButton({
  photoId,
  farmId,
  onDeleted,
}: PhotoDeleteButtonProps) {
  const [isPending, start] = useTransition()
  const { toast }          = useToast()

  async function handleConfirm() {
    start(async () => {
      const result = await deleteAnimalPhoto(photoId, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Foto removida.' })
      onDeleted?.()
    })
  }

  return (
    <ConfirmDialog
      title="Remover foto?"
      description="Esta ação não pode ser desfeita. A foto será excluída permanentemente."
      confirmLabel="Remover"
      variant="destructive"
      onConfirm={handleConfirm}
    >
      <button
        type="button"
        disabled={isPending}
        aria-label="Remover foto"
        className="flex items-center gap-1.5 text-xs text-destructive/70 hover:text-destructive transition-colors disabled:opacity-40"
      >
        <Trash2 className="size-3.5" />
        {isPending ? 'Removendo…' : 'Remover foto'}
      </button>
    </ConfirmDialog>
  )
}
