'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Edit2, Copy, Trash2 } from 'lucide-react'
import { duplicateEarTagTemplate, deleteEarTagTemplate } from '../actions'
import type { EarTagTemplateItem } from '../types'

interface TemplateCardProps {
  template: EarTagTemplateItem
  farmId:   string
  canEdit:  boolean
}

export function TemplateCard({ template, farmId, canEdit }: TemplateCardProps) {
  const { toast }          = useToast()
  const [isPending, start] = useTransition()

  function handleDuplicate() {
    start(async () => {
      const result = await duplicateEarTagTemplate(template.id, farmId)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: 'Modelo duplicado!' })
    })
  }

  async function handleDelete() {
    const result = await deleteEarTagTemplate(template.id, farmId)
    if (!result.success) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Modelo excluído.' })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Nome + dimensões */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground">
            {template.widthMm} × {template.heightMm} mm · {template.orientation === 'landscape' ? 'Paisagem' : 'Retrato'}
          </p>
        </div>
        <div
          className="size-8 rounded border border-border shrink-0"
          style={{ backgroundColor: template.bgColor }}
          title={`Cor de fundo: ${template.bgColor}`}
        />
      </div>

      {/* Tags de campos visíveis */}
      <div className="flex flex-wrap gap-1.5">
        {template.showAnimalTag  && <Chip>Brinco</Chip>}
        {template.showAnimalName && <Chip>Nome</Chip>}
        {template.showFarmName   && <Chip>Fazenda</Chip>}
        {template.showBorder     && <Chip>Borda</Chip>}
        <Chip>QR {template.qrSizeMm} mm</Chip>
      </div>

      {/* Ações */}
      {canEdit && (
        <div className="flex items-center gap-2 pt-1 border-t border-border">
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link href={`/ear-tags/${template.id}/edit`}>
              <Edit2 className="size-3.5 mr-1" />
              Editar
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleDuplicate}
            disabled={isPending}
          >
            <Copy className="size-3.5 mr-1" />
            Duplicar
          </Button>

          <ConfirmDialog
            title="Excluir modelo?"
            description={`O modelo "${template.name}" será excluído permanentemente.`}
            confirmLabel="Excluir"
            variant="destructive"
            onConfirm={handleDelete}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-destructive hover:text-destructive ml-auto"
              disabled={isPending}
            >
              <Trash2 className="size-3.5 mr-1" />
              Excluir
            </Button>
          </ConfirmDialog>
        </div>
      )}
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-medium">
      {children}
    </span>
  )
}
