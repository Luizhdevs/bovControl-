'use client'

import { useState, useTransition } from 'react'
import { useRouter }               from 'next/navigation'
import { Settings2, Star }         from 'lucide-react'
import { Button }                  from '@/components/ui/button'
import { updateFarmSettings }      from '../actions'
import type { FarmSettingsWithLot } from '../queries'

interface LotOption {
  id:   string
  name: string
  type: string
}

interface Props {
  farmId:   string
  settings: FarmSettingsWithLot
  lots:     LotOption[]
  canEdit:  boolean
}

export function FarmSettingsForm({ farmId, settings, lots, canEdit }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [mainLotId,            setMainLotId]            = useState(settings.mainProductionLotId ?? '')
  const [enableParticipants,   setEnableParticipants]   = useState(settings.enableMilkParticipants)
  const [autoMilkStatus,       setAutoMilkStatus]       = useState(settings.autoUpdateMilkStatus)
  const [useEstimated,         setUseEstimated]         = useState(settings.useEstimatedMilkPerCow)
  const [error,                setError]                = useState<string | null>(null)
  const [saved,                setSaved]                = useState(false)

  async function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateFarmSettings(farmId, {
        mainProductionLotId:    mainLotId || null,
        enableMilkParticipants: enableParticipants,
        autoUpdateMilkStatus:   autoMilkStatus,
        useEstimatedMilkPerCow: useEstimated,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        setSaved(true)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">

      {/* Lote Principal de Produção */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Star className="size-3 text-amber-400" />
          Lote Principal de Produção
        </label>
        <select
          disabled={!canEdit || isPending}
          value={mainLotId}
          onChange={(e) => setMainLotId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">— Nenhum selecionado —</option>
          {lots.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground">
          As vacas deste lote aparecem automaticamente no registro de ordenha.
        </p>
      </div>

      {/* Feature flags */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Settings2 className="size-3" />
          Funcionalidades
        </p>

        <Toggle
          label="Participantes da ordenha"
          description="Selecionar quais vacas participaram de cada turno"
          checked={enableParticipants}
          onChange={setEnableParticipants}
          disabled={!canEdit || isPending}
        />

        <Toggle
          label="Atualização automática do status leiteiro"
          description="Atualiza LACTATING/DRY automaticamente ao mover animal de lote"
          checked={autoMilkStatus}
          onChange={setAutoMilkStatus}
          disabled={!canEdit || isPending}
        />

        <Toggle
          label="Produção estimada por vaca"
          description="Distribui os litros igualmente entre as vacas participantes"
          checked={useEstimated}
          onChange={setUseEstimated}
          disabled={!canEdit || isPending}
        />
      </div>

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
      {saved && (
        <p className="text-xs text-emerald-500 bg-emerald-500/10 rounded-lg px-3 py-2">
          Configurações salvas.
        </p>
      )}

      {canEdit && (
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="w-full"
          size="sm"
        >
          {isPending ? 'Salvando…' : 'Salvar configurações'}
        </Button>
      )}
    </div>
  )
}

function Toggle({
  label, description, checked, onChange, disabled,
}: {
  label:       string
  description: string
  checked:     boolean
  onChange:    (v: boolean) => void
  disabled:    boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`
          relative shrink-0 inline-flex h-5 w-9 rounded-full border-2 transition-colors
          focus-visible:outline-none disabled:opacity-50
          ${checked ? 'bg-primary border-primary' : 'bg-muted border-border'}
        `}
      >
        <span className={`
          pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `} />
      </button>
    </div>
  )
}
