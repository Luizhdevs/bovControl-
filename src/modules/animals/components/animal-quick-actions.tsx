'use client'

import { useTransition, useState, useRef } from 'react'
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
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QuickActionBar, type QuickAction } from '@/components/shared/quick-action-bar'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

import {
  transferAnimalToLot,
  addWeightRecord,
  addAnimalPhoto,
  registerCalving,
} from '../actions'
import {
  AnimalStatusActionsSheets,
  type StatusChangeType,
} from './animal-status-actions'
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
  MoreHorizontal,
  DollarSign,
  Baby,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LotSelectOption } from '../types'

// ─── Tipos ─────────────────────────────────────────────────

type SheetType = 'lot' | 'weight' | 'milk' | 'photo' | 'more' | 'calving' | StatusChangeType

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
  const [fileName, setFileName] = useState<string | null>(null)
  const [isPending, start]      = useTransition()
  const fileRef                 = useRef<HTMLInputElement>(null)
  const { toast }               = useToast()

  const ALLOWED_TYPES  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const MAX_SIZE_BYTES = 5 * 1024 * 1024

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setFileName(file?.name ?? null)
  }

  function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast({ title: 'Selecione uma foto', variant: 'destructive' })
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use JPEG, PNG, WebP ou HEIC.', variant: 'destructive' })
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: 'Arquivo muito grande', description: 'Máximo de 5 MB por foto.', variant: 'destructive' })
      return
    }

    start(async () => {
      try {
        const form = new FormData()
        form.append('file',     file)
        form.append('animalId', animalId)

        const response = await fetch('/api/upload', { method: 'POST', body: form })
        const data = (await response.json()) as {
          url?: string; thumbnailUrl?: string; sizeKb?: number; error?: string
        }

        if (!response.ok || !data.url) {
          toast({ title: 'Erro no upload', description: data.error ?? 'Tente novamente.', variant: 'destructive' })
          return
        }

        const result = await addAnimalPhoto(farmId, {
          animalId,
          url:          data.url,
          thumbnailUrl: data.thumbnailUrl ?? null,
          sizeKb:       data.sizeKb ?? 0,
          caption:      null,
        })

        if (!result.success) {
          toast({ title: 'Erro', description: result.error, variant: 'destructive' })
          return
        }

        toast({ title: 'Foto adicionada!' })
        setFileName(null)
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
        <SheetHeader className="mb-6">
          <SheetTitle>Adicionar Foto</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Área de seleção — label nativa evita o teclado no iOS */}
          <label
            htmlFor="photo-file-input"
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors',
              fileName
                ? 'border-primary/40 bg-primary/5'
                : 'border-border hover:border-primary/30 active:bg-muted/40',
            )}
          >
            <Camera className={cn('size-8', fileName ? 'text-primary' : 'text-muted-foreground/40')} />
            <span className="text-sm text-center text-muted-foreground leading-snug">
              {fileName ?? 'Toque para selecionar ou tirar foto'}
            </span>
            <input
              id="photo-file-input"
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
            />
          </label>

          <Button
            className="w-full h-12 text-base"
            onClick={handleUpload}
            disabled={isPending || !fileName}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Camera className="size-4 mr-2" />
            )}
            {isPending ? 'Enviando...' : 'Enviar Foto'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Sheet: Registrar parto ────────────────────────────────

function CalvingSheet({
  animalId,
  open,
  onClose,
}: {
  animalId: string
  open:     boolean
  onClose:  () => void
}) {
  const [birthDate, setBirthDate] = useState('')
  const [calveSex, setCalveSex]   = useState<'MALE' | 'FEMALE'>('FEMALE')
  const [calveName, setCalveName] = useState('')
  const [isPending, start]        = useTransition()
  const { toast }                 = useToast()

  function handleSubmit() {
    if (!birthDate) {
      toast({ title: 'Informe a data do parto', variant: 'destructive' })
      return
    }
    start(async () => {
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
      toast({ title: `Parto registrado!`, description: `Bezerro ${result.calveTag} criado.` })
      setBirthDate('')
      setCalveName('')
      setCalveSex('FEMALE')
      onClose()
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-5">
          <SheetTitle>Registrar Parto</SheetTitle>
          <SheetDescription>
            Um bezerro será criado e vinculado a esta vaca automaticamente.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          {/* Sexo do bezerro */}
          <div className="space-y-2">
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
                  className={cn(
                    'rounded-xl border py-3.5 text-sm font-semibold transition-all active:scale-95',
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
          <div className="space-y-2">
            <Label>Data do parto</Label>
            <Input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Nome do bezerro */}
          <div className="space-y-2">
            <Label>
              Nome do bezerro
              <span className="text-muted-foreground font-normal ml-1">(opcional)</span>
            </Label>
            <Input
              value={calveName}
              onChange={(e) => setCalveName(e.target.value)}
              placeholder="Ex: Pintada, Formosa…"
              maxLength={60}
              style={{ fontSize: '16px' }}
            />
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isPending || !birthDate}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Baby className="size-4 mr-2" />
            )}
            {isPending ? 'Registrando…' : 'Registrar Parto'}
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
  const [openSheet, setOpenSheet] = useState<SheetType>(null)

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
    ...(guards.reproduction.allowed ? [{
      id:      'calving',
      icon:    Baby,
      label:   'Parto',
      onClick: () => setOpenSheet('calving'),
    }] : []),
    {
      id:    'ear-tag',
      icon:  Tag,
      label: 'Etiqueta',
      href:  `/ear-tags/print?animalId=${animalId}`,
    },
  ]

  const statusChangeType: StatusChangeType =
    openSheet === 'sold' || openSheet === 'dead' || openSheet === 'transferred'
      ? openSheet
      : null

  return (
    <>
      {/* Barra de ações rápidas */}
      {isActive && (
        <QuickActionBar actions={quickActions} className="mb-4" />
      )}

      {/* Rodapé fixo — single row */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-4 pt-3 pb-5">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-12 text-sm font-medium" asChild>
              <a href={`/animals/${animalId}/edit`}>
                <Edit2 className="size-4 mr-2" />
                Editar
              </a>
            </Button>
            <Button
              className="flex-1 h-12 text-sm font-medium"
              onClick={() => setOpenSheet('lot')}
              disabled={!guards.lot.allowed}
              title={guards.lot.allowed ? undefined : guards.lot.reason}
            >
              <ArrowLeftRight className="size-4 mr-2" />
              Trocar Lote
            </Button>
            {canManage && (
              <Button
                variant="outline"
                className="h-12 w-12 px-0 shrink-0"
                onClick={() => setOpenSheet('more')}
              >
                <MoreHorizontal className="size-5" />
              </Button>
            )}
          </div>
        </div>
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

      <CalvingSheet
        animalId={animalId}
        open={openSheet === 'calving'}
        onClose={() => setOpenSheet(null)}
      />

      {/* Sheet: Mais ações */}
      {canManage && (
        <Sheet open={openSheet === 'more'} onOpenChange={(v) => !v && setOpenSheet(null)}>
          <SheetContent side="bottom" className="rounded-t-2xl pb-8">
            <SheetHeader className="mb-5">
              <SheetTitle>Mais ações</SheetTitle>
              <SheetDescription>
                Ações que alteram o status permanente do animal.
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-3">
              <button
                type="button"
                disabled={!guards.slaughter.allowed}
                onClick={() => setOpenSheet('sold')}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-colors',
                  guards.slaughter.allowed
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-500 hover:bg-amber-500/10'
                    : 'border-border text-muted-foreground opacity-50 cursor-not-allowed',
                )}
              >
                <div className="size-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <DollarSign className="size-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Registrar como Vendido</p>
                  {!guards.slaughter.allowed && (
                    <p className="text-xs text-muted-foreground mt-0.5">{guards.slaughter.reason}</p>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOpenSheet('transferred')}
                className="w-full flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 px-4 py-3.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="size-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Registrar Transferência</p>
                  <p className="text-xs text-blue-500/70 mt-0.5">Para outra fazenda ou proprietário</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOpenSheet('dead')}
                className="w-full flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <div className="size-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="size-4 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Registrar Óbito</p>
                  <p className="text-xs text-destructive/70 mt-0.5">Registre a data e a causa mortis</p>
                </div>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Sheets de mudança de status — Vendido / Óbito / Transferência */}
      {canManage && (
        <AnimalStatusActionsSheets
          animalId={animalId}
          openType={statusChangeType}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </>
  )
}
