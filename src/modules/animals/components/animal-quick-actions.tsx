'use client'

import React, { useTransition, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast }  from '@/hooks/use-toast'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MobileBottomActions } from '@/components/shared/mobile-bottom-actions'
import { QuickActionBar, type QuickAction } from '@/components/shared/quick-action-bar'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

import {
  transferAnimalToLot,
  addWeightRecord,
  addAnimalPhoto,
  deactivateAnimal,
} from '../actions'
import { registerMilkRecord } from '@/modules/milk/actions'
import { getAnimalOperationGuards } from '@/modules/shared/domain/animal-rules'
import { LOT_TYPE_LABELS, MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'

import {
  Edit2,
  ArrowLeftRight,
  Scale,
  MilkIcon,
  Camera,
  Heart,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Tag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LotSelectOption } from '../types'

// ─── Tipos ─────────────────────────────────────────────────

type SheetType = 'lot' | 'weight' | 'milk' | 'photo' | null

interface AnimalQuickActionsProps {
  animalId:    string
  farmId:      string
  animalTag:   string
  animalStatus: string
  animalSex:   string
  animalCategory: string
  animalBirthType: string | null
  currentLotId: string | null
  lots:         LotSelectOption[]
  userRole:     string
}

// ─── Sheet: Trocar lote ────────────────────────────────────

function TransferLotSheet({
  animalId,
  farmId,
  currentLotId,
  lots,
  open,
  onClose,
}: {
  animalId:     string
  farmId:       string
  currentLotId: string | null
  lots:         LotSelectOption[]
  open:         boolean
  onClose:      () => void
}) {
  const [selectedLot, setSelectedLot] = useState<string>(currentLotId ?? 'none')
  const [isPending, start] = useTransition()
  const { toast } = useToast()

  function handleTransfer() {
    start(async () => {
      const result = await transferAnimalToLot(farmId, {
        animalId,
        lotId: selectedLot === 'none' ? null : selectedLot,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: 'Transferência realizada!' })
      onClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh]">
        <SheetHeader className="mb-5">
          <SheetTitle>Transferir para Lote</SheetTitle>
          <SheetDescription>
            Selecione o lote de destino. Novilhas movidas para lotes de lactação
            serão automaticamente promovidas a vacas.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <Select value={selectedLot} onValueChange={setSelectedLot}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Selecionar lote..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Sem lote</span>
              </SelectItem>
              {lots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>
                  <div className="flex items-center gap-2">
                    <span>{lot.name}</span>
                    <span className="text-xs text-muted-foreground">
                      · {LOT_TYPE_LABELS[lot.type]}
                    </span>
                    {lot.maxCapacity && (
                      <span className="text-xs text-muted-foreground">
                        ({lot._count.animals}/{lot.maxCapacity})
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full h-12 text-base"
            onClick={handleTransfer}
            disabled={isPending || selectedLot === (currentLotId ?? 'none')}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            Confirmar Transferência
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sheet: Registrar peso ─────────────────────────────────

function WeightSheet({
  animalId,
  farmId,
  open,
  onClose,
}: {
  animalId: string
  farmId:   string
  open:     boolean
  onClose:  () => void
}) {
  const [weight, setWeight]   = useState('')
  const [isPending, start]    = useTransition()
  const { toast }             = useToast()

  function handleSubmit() {
    const kg = parseFloat(weight.replace(',', '.'))
    if (isNaN(kg) || kg <= 0) {
      toast({ title: 'Peso inválido', variant: 'destructive' })
      return
    }

    start(async () => {
      const result = await addWeightRecord(farmId, {
        animalId,
        weightKg: kg,
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: `${kg} kg registrado!` })
      setWeight('')
      onClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle>Registrar Pesagem</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder="0.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-16 text-3xl text-center font-bold"
              style={{ fontSize: '28px' }}
              autoFocus
            />
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending || !weight}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Scale className="size-4 mr-2" />
            )}
            Salvar Pesagem
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sheet: Registrar leite ────────────────────────────────

function MilkSheet({
  animalId,
  farmId,
  open,
  onClose,
}: {
  animalId: string
  farmId:   string
  open:     boolean
  onClose:  () => void
}) {
  const [liters, setLiters]   = useState('')
  const [shift, setShift]     = useState<string>('MORNING')
  const [isPending, start]    = useTransition()
  const { toast }             = useToast()

  function handleSubmit() {
    const value = parseFloat(liters.replace(',', '.'))
    if (isNaN(value) || value <= 0) {
      toast({ title: 'Produção inválida', variant: 'destructive' })
      return
    }

    start(async () => {
      const result = await registerMilkRecord(farmId, {
        animalId,
        liters: value,
        shift:  shift as 'MORNING' | 'AFTERNOON',
      })

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: `${value}L registrado!` })
      setLiters('')
      onClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle>Registrar Produção</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Turno */}
          <div className="grid grid-cols-2 gap-2">
            {(['MORNING', 'AFTERNOON'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={cn(
                  'rounded-lg border py-3 text-sm font-medium transition-all active:scale-95',
                  shift === s
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground',
                )}
              >
                {MILK_SHIFT_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Litros */}
          <div className="space-y-2">
            <Label>Produção (litros)</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0.0"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="h-16 text-3xl text-center font-bold pr-12"
                style={{ fontSize: '28px' }}
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                L
              </span>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending || !liters}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <MilkIcon className="size-4 mr-2" />
            )}
            Salvar Produção
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sheet: Nova foto ──────────────────────────────────────

function PhotoSheet({
  animalId,
  farmId,
  open,
  onClose,
}: {
  animalId: string
  farmId:   string
  open:     boolean
  onClose:  () => void
}) {
  const [caption, setCaption] = useState('')
  const [isPending, start]    = useTransition()
  const fileRef               = useRef<HTMLInputElement>(null)
  const { toast }             = useToast()

  // Espelha as restrições do /api/upload — feedback imediato antes do request
  const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

  function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast({ title: 'Selecione uma foto', variant: 'destructive' })
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title:       'Formato inválido',
        description: 'Use JPEG, PNG, WebP ou HEIC.',
        variant:     'destructive',
      })
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title:       'Arquivo muito grande',
        description: 'Máximo de 5 MB por foto.',
        variant:     'destructive',
      })
      return
    }

    start(async () => {
      try {
        // Envia o arquivo para /api/upload via FormData
        const form = new FormData()
        form.append('file',     file)
        form.append('animalId', animalId)   // validação de posse no servidor

        const response = await fetch('/api/upload', { method: 'POST', body: form })
        const data = (await response.json()) as {
          url?:          string
          thumbnailUrl?: string
          sizeKb?:       number
          error?:        string
        }

        if (!response.ok || !data.url) {
          toast({
            title:       'Erro no upload',
            description: data.error ?? 'Tente novamente.',
            variant:     'destructive',
          })
          return
        }

        // Persiste as URLs e metadados no banco via Server Action
        const result = await addAnimalPhoto(farmId, {
          animalId,
          url:          data.url,
          thumbnailUrl: data.thumbnailUrl ?? null,
          sizeKb:       data.sizeKb ?? 0,
          caption:      caption || null,
        })

        if (!result.success) {
          toast({ title: 'Erro', description: result.error, variant: 'destructive' })
          return
        }

        toast({ title: 'Foto adicionada!' })
        setCaption('')
        if (fileRef.current) fileRef.current.value = ''
        onClose()
      } catch {
        toast({ title: 'Erro no upload', description: 'Verifique a conexão.', variant: 'destructive' })
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle>Adicionar Foto</SheetTitle>
          <SheetDescription>
            A foto será adicionada à linha do tempo do animal.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Input de arquivo */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer active:bg-muted/50"
            onClick={() => fileRef.current?.click()}
          >
            <Camera className="size-8 text-muted-foreground/50" />
            <span className="text-sm text-muted-foreground">
              Toque para selecionar ou tirar foto
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Legenda */}
          <div className="space-y-2">
            <Label>Legenda (opcional)</Label>
            <Input
              placeholder="Ex: Pesagem trimestral, Após parto..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="h-12"
              style={{ fontSize: '16px' }}
            />
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleUpload}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Camera className="size-4 mr-2" />
            )}
            Enviar Foto
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Botão "+ Foto" reutilizável ──────────────────────────
//
// Client component standalone — usado no SectionCard "Linha do Tempo"
// do Server Component da página, onde não há acesso ao estado do
// AnimalQuickActions. Gerencia seu próprio estado de abertura do Sheet.

export function AddPhotoButton({
  animalId,
  farmId,
  className,
  children = '+ Foto',
}: {
  animalId:  string
  farmId:    string
  className?: string
  children?:  React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      <PhotoSheet
        animalId={animalId}
        farmId={farmId}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Gerencia todas as ações interativas da página de detalhes do animal.
 * Client Component — recebe dados do Server Component e lida com toda interatividade.
 *
 * Centraliza:
 * - Avaliação dos guards de domínio
 * - Sheets de ação rápida (peso, leite, foto, lote)
 * - Barra de ações do rodapé (editar, deactivate)
 */
export function AnimalQuickActions({
  animalId,
  farmId,
  animalTag,
  animalStatus,
  animalSex,
  animalCategory,
  animalBirthType,
  currentLotId,
  lots,
  userRole,
}: AnimalQuickActionsProps) {
  const router            = useRouter()
  const { toast }         = useToast()
  const [openSheet, setOpenSheet] = useState<SheetType>(null)
  const [isPending, start] = useTransition()

  const animal = {
    sex:       animalSex,
    category:  animalCategory,
    status:    animalStatus,
    birthType: animalBirthType,
  }

  // Avalia todos os guards de uma vez
  const guards  = getAnimalOperationGuards(animal)
  const isActive = animalStatus === 'ACTIVE'
  const canManage = ['OWNER', 'MANAGER'].includes(userRole)

  // Ações rápidas da barra
  const quickActions: QuickAction[] = [
    {
      id:      'weight',
      icon:    Scale,
      label:   'Pesagem',
      onClick: () => setOpenSheet('weight'),
      disabled: !guards.weight.allowed,
      disabledReason: guards.weight.reason,
    },
    {
      id:      'milk',
      icon:    MilkIcon,
      label:   'Leite',
      onClick: () => setOpenSheet('milk'),
      disabled: !guards.milk.allowed,
      disabledReason: guards.milk.reason,
      highlight: guards.milk.allowed,
    },
    {
      id:      'photo',
      icon:    Camera,
      label:   'Foto',
      onClick: () => setOpenSheet('photo'),
    },
    {
      id:    'lot',
      icon:  ArrowLeftRight,
      label: 'Lote',
      onClick: () => setOpenSheet('lot'),
      disabled: !guards.lot.allowed,
      disabledReason: guards.lot.reason,
    },
    {
      id:    'reproduction',
      icon:  Heart,
      label: 'Reprodução',
      href:  `/animals/${animalId}/reproduction`,
      disabled: !guards.reproduction.allowed,
      disabledReason: guards.reproduction.reason,
    },
    {
      id:    'ear-tag',
      icon:  Tag,
      label: 'Etiqueta',
      href:  `/ear-tags/print?animalId=${animalId}`,
    },
  ]

  // Ações do rodapé
  async function handleDeactivate(status: 'SOLD' | 'DEAD') {
    start(async () => {
      const result = await deactivateAnimal(animalId, farmId, status)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({ title: status === 'SOLD' ? 'Registrado como vendido.' : 'Óbito registrado.' })
      router.push('/animals')
    })
  }

  return (
    <>
      {/* Barra de ações rápidas */}
      {isActive && (
        <QuickActionBar actions={quickActions} className="mb-4" />
      )}

      {/* Rodapé fixo */}
      {isActive && (
        <MobileBottomActions
          primary={[
            {
              label: 'Editar',
              icon:  Edit2,
              href:  `/animals/${animalId}/edit`,
              variant: 'outline',
            },
            {
              label:   'Trocar Lote',
              icon:    ArrowLeftRight,
              onClick: () => setOpenSheet('lot'),
              disabled: !guards.lot.allowed,
              disabledReason: guards.lot.reason,
            },
          ]}
          secondary={
            canManage
              ? [
                  {
                    label:   'Vendido',
                    variant: 'outline' as const,
                    onClick: () => handleDeactivate('SOLD'),
                    disabled: !guards.slaughter.allowed || isPending,
                    disabledReason: guards.slaughter.allowed ? undefined : guards.slaughter.reason,
                    className: guards.slaughter.allowed ? 'text-amber-400 border-amber-400/30' : '',
                  },
                  {
                    label:    'Óbito',
                    icon:     AlertTriangle,
                    variant:  'outline' as const,
                    onClick:  () => handleDeactivate('DEAD'),
                    disabled: isPending,
                    className: 'text-destructive border-destructive/30',
                  },
                ]
              : undefined
          }
        />
      )}

      {/* Sheets de ação rápida */}
      <TransferLotSheet
        animalId={animalId}
        farmId={farmId}
        currentLotId={currentLotId}
        lots={lots}
        open={openSheet === 'lot'}
        onClose={() => setOpenSheet(null)}
      />

      <WeightSheet
        animalId={animalId}
        farmId={farmId}
        open={openSheet === 'weight'}
        onClose={() => setOpenSheet(null)}
      />

      <MilkSheet
        animalId={animalId}
        farmId={farmId}
        open={openSheet === 'milk'}
        onClose={() => setOpenSheet(null)}
      />

      <PhotoSheet
        animalId={animalId}
        farmId={farmId}
        open={openSheet === 'photo'}
        onClose={() => setOpenSheet(null)}
      />
    </>
  )
}
