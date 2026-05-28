'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { useForm }                  from 'react-hook-form'
import { zodResolver }              from '@hookform/resolvers/zod'
import * as Dialog                  from '@radix-ui/react-dialog'
import {
  Building2, ChevronDown, Check, Plus, Loader2, X,
} from 'lucide-react'
import { setActiveFarm, createFarm } from '@/modules/farms/actions'
import { createFarmSchema, type CreateFarmInput } from '@/modules/farms/schema'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { UserRole } from '@prisma/client'

// ─── Tipos ────────────────────────────────────────────────

interface FarmOption {
  farmId: string
  role:   UserRole
  farm:   { id: string; name: string; city: string | null; state: string }
}

interface FarmSwitcherProps {
  farms:        FarmOption[]
  activeFarmId: string
  canCreate:    boolean
}

const ROLE_LABELS: Record<UserRole, string> = {
  OWNER:   'Proprietário',
  MANAGER: 'Gerente',
  WORKER:  'Funcionário',
  VIEWER:  'Visualizador',
}

// ─── Componente principal ─────────────────────────────────

export function FarmSwitcher({ farms, activeFarmId, canCreate }: FarmSwitcherProps) {
  const router       = useRouter()
  const [open, setOpen]             = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activeFarm = farms.find((f) => f.farmId === activeFarmId) ?? farms[0]

  function handleSwitch(farmId: string) {
    if (farmId === activeFarmId) { setOpen(false); return }
    startTransition(async () => {
      await setActiveFarm(farmId)
      setOpen(false)
      router.refresh()
    })
  }

  function handleCreateSuccess() {
    setShowCreate(false)
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <div className="relative">
      {/* Botão atual */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className={cn(
          'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5',
          'text-sm font-medium transition-colors',
          'hover:bg-muted',
          open && 'bg-muted',
        )}
      >
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="max-w-[120px] truncate">{activeFarm?.farm.name ?? '—'}</span>
        <ChevronDown className={cn(
          'size-3 shrink-0 text-muted-foreground transition-transform duration-150',
          open && 'rotate-180',
        )} />
      </button>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute left-0 top-full mt-1 z-50',
          'w-64 rounded-xl border border-border bg-popover shadow-lg',
          'overflow-hidden',
        )}>
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground">Suas fazendas</p>
          </div>

          <div className="py-1.5 space-y-0.5 px-1.5">
            {farms.map((f) => (
              <button
                key={f.farmId}
                onClick={() => handleSwitch(f.farmId)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg',
                  'text-left text-sm transition-colors',
                  f.farmId === activeFarmId
                    ? 'bg-primary/8 text-foreground'
                    : 'hover:bg-muted text-foreground',
                )}
              >
                <div className="size-4 flex items-center justify-center shrink-0">
                  {f.farmId === activeFarmId && (
                    <Check className="size-3.5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate leading-tight">{f.farm.name}</p>
                  {f.farm.city && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {f.farm.city}, {f.farm.state}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                  {ROLE_LABELS[f.role]}
                </span>
              </button>
            ))}
          </div>

          {canCreate && (
            <>
              <div className="border-t border-border mx-1.5 mb-1" />
              <div className="px-1.5 pb-1.5">
                <button
                  onClick={() => { setShowCreate(true); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg',
                    'text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
                  )}
                >
                  <Plus className="size-4 shrink-0" />
                  Nova Fazenda
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Dialog de criação */}
      <Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
          <Dialog.Content className={cn(
            'fixed left-1/2 top-1/2 z-50',
            '-translate-x-1/2 -translate-y-1/2',
            'w-[calc(100vw-32px)] max-w-md',
            'rounded-2xl border border-border bg-card p-6 shadow-xl',
          )}>
            <div className="flex items-center justify-between mb-5">
              <Dialog.Title className="text-lg font-semibold">Nova Fazenda</Dialog.Title>
              <Dialog.Close className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground">
                <X className="size-4" />
              </Dialog.Close>
            </div>
            <CreateFarmForm onSuccess={handleCreateSuccess} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ─── Formulário de criação ────────────────────────────────

function CreateFarmForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, formState: { errors } } = useForm<CreateFarmInput>({
    resolver:      zodResolver(createFarmSchema),
    defaultValues: { name: '', city: '', state: 'MG' },
  })

  function onSubmit(data: CreateFarmInput) {
    startTransition(async () => {
      const result = await createFarm(data)
      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }
      toast({
        title:       'Fazenda criada!',
        description: `${data.name} foi adicionada com sucesso.`,
      })
      onSuccess()
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="farm-name">Nome da fazenda *</Label>
        <Input
          id="farm-name"
          placeholder="Ex: Fazenda Perdigão"
          style={{ fontSize: '16px' }}
          {...register('name')}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_80px] gap-3">
        <div className="space-y-2">
          <Label htmlFor="farm-city">Cidade</Label>
          <Input
            id="farm-city"
            placeholder="Ex: Perdigão"
            style={{ fontSize: '16px' }}
            {...register('city')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="farm-state">Estado *</Label>
          <Input
            id="farm-state"
            placeholder="MG"
            maxLength={2}
            className="uppercase"
            style={{ fontSize: '16px' }}
            {...register('state')}
          />
          {errors.state && (
            <p className="text-xs text-destructive">{errors.state.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending
          ? <><Loader2 className="size-4 animate-spin mr-2" /> Criando...</>
          : <><Plus className="size-4 mr-2" /> Criar Fazenda</>}
      </Button>
    </form>
  )
}
