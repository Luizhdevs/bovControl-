'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast }  from '@/hooks/use-toast'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { TemplatePreview } from './template-preview'
import { createEarTagTemplate, updateEarTagTemplate } from '../actions'
import { PREVIEW_ANIMAL, PREVIEW_FARM_NAME } from '../types'
import type { EarTagTemplateInput } from '../schema'
import type { EarTagTemplateItem } from '../types'
import { cn } from '@/lib/utils'

// ─── Defaults ──────────────────────────────────────────────

const DEFAULTS: EarTagTemplateInput = {
  name:              '',
  widthMm:           50,
  heightMm:          25,
  paddingMm:         3,
  fontSizeMain:      14,
  fontSizeSecondary: 9,
  qrSizeMm:          18,
  showAnimalName:    false,
  showAnimalTag:     true,
  showFarmName:      false,
  showBorder:        true,
  orientation:       'landscape',
  bgColor:           '#FFFFFF',
  textColor:         '#000000',
  layoutJson:        {},
}

// ─── Props ─────────────────────────────────────────────────

interface TemplateFormProps {
  farmId:    string
  farmName?: string
  initial?:  EarTagTemplateItem
}

// ─── Row helpers ───────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-muted-foreground shrink-0">{label}</Label>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  )
}

function NumberInput({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value:    number
  min:      number
  max:      number
  step?:    number
  onChange: (v: number) => void
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => {
        const v = parseFloat(e.target.value)
        if (!isNaN(v)) onChange(v)
      }}
      className="h-9 text-right w-24"
    />
  )
}

function ToggleButton({
  checked,
  onChange,
  label,
}: {
  checked:  boolean
  onChange: (v: boolean) => void
  label:    string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-muted-foreground cursor-pointer">{label}</Label>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none',
          checked ? 'bg-primary' : 'bg-muted-foreground/30',
        )}
        aria-checked={checked}
        role="switch"
      >
        <span
          className={cn(
            'pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg transform transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  )
}

// ─── Formulário principal ──────────────────────────────────

export function TemplateForm({ farmId, farmName = PREVIEW_FARM_NAME, initial }: TemplateFormProps) {
  const router             = useRouter()
  const { toast }          = useToast()
  const [isPending, start] = useTransition()

  const [form, setForm] = useState<EarTagTemplateInput>(() => {
    if (!initial) return DEFAULTS
    return {
      name:              initial.name,
      widthMm:           initial.widthMm,
      heightMm:          initial.heightMm,
      paddingMm:         initial.paddingMm,
      fontSizeMain:      initial.fontSizeMain,
      fontSizeSecondary: initial.fontSizeSecondary,
      qrSizeMm:          initial.qrSizeMm,
      showAnimalName:    initial.showAnimalName,
      showAnimalTag:     initial.showAnimalTag,
      showFarmName:      initial.showFarmName,
      showBorder:        initial.showBorder,
      orientation:       initial.orientation as 'landscape' | 'portrait',
      bgColor:           initial.bgColor,
      textColor:         initial.textColor,
      layoutJson:        (initial.layoutJson as Record<string, unknown>) ?? {},
    }
  })

  function set<K extends keyof EarTagTemplateInput>(key: K, value: EarTagTemplateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    start(async () => {
      const result = initial
        ? await updateEarTagTemplate(initial.id, farmId, form)
        : await createEarTagTemplate(farmId, form)

      if (!result.success) {
        toast({ title: 'Erro', description: result.error, variant: 'destructive' })
        return
      }

      toast({ title: initial ? 'Modelo atualizado!' : 'Modelo criado!' })
      router.push('/ear-tags')
    })
  }

  return (
    <div className="space-y-6">
      {/* Preview ao vivo */}
      <div className="rounded-xl border border-border bg-muted/30 p-5 flex justify-center">
        <TemplatePreview
          template={form}
          animal={PREVIEW_ANIMAL}
          farmName={farmName}
        />
      </div>

      {/* Campos do formulário */}
      <div className="space-y-4">

        {/* Nome */}
        <div className="space-y-1.5">
          <Label>Nome do modelo <span className="text-destructive">*</span></Label>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ex: Padrão 50×25, Brinco Pequeno..."
            className="h-10"
            maxLength={60}
          />
        </div>

        {/* Dimensões */}
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Dimensões</legend>
          <FieldRow label="Largura (mm)">
            <NumberInput value={form.widthMm}   min={15} max={150} step={0.5} onChange={(v) => set('widthMm', v)} />
          </FieldRow>
          <FieldRow label="Altura (mm)">
            <NumberInput value={form.heightMm}  min={10} max={100} step={0.5} onChange={(v) => set('heightMm', v)} />
          </FieldRow>
          <FieldRow label="Margem interna (mm)">
            <NumberInput value={form.paddingMm} min={0}  max={20}  step={0.5} onChange={(v) => set('paddingMm', v)} />
          </FieldRow>
          <FieldRow label="Orientação">
            <Select value={form.orientation} onValueChange={(v) => set('orientation', v as 'landscape' | 'portrait')}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Paisagem</SelectItem>
                <SelectItem value="portrait">Retrato</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </fieldset>

        {/* QR Code */}
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">QR Code</legend>
          <FieldRow label="Tamanho do QR (mm)">
            <NumberInput value={form.qrSizeMm} min={5} max={50} step={0.5} onChange={(v) => set('qrSizeMm', v)} />
          </FieldRow>
          <FieldRow label="Posição do QR">
            <Select
              value={(form.layoutJson as { qrPosition?: string }).qrPosition ?? 'right'}
              onValueChange={(v) => set('layoutJson', { ...form.layoutJson, qrPosition: v })}
            >
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Direita</SelectItem>
                <SelectItem value="left">Esquerda</SelectItem>
                <SelectItem value="bottom">Abaixo</SelectItem>
              </SelectContent>
            </Select>
          </FieldRow>
        </fieldset>

        {/* Tipografia */}
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Tipografia</legend>
          <FieldRow label="Fonte principal (pt)">
            <NumberInput value={form.fontSizeMain}      min={6} max={36} onChange={(v) => set('fontSizeMain', Math.round(v))} />
          </FieldRow>
          <FieldRow label="Fonte secundária (pt)">
            <NumberInput value={form.fontSizeSecondary} min={4} max={24} onChange={(v) => set('fontSizeSecondary', Math.round(v))} />
          </FieldRow>
        </fieldset>

        {/* Campos visíveis */}
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Campos exibidos</legend>
          <ToggleButton label="Número do brinco" checked={form.showAnimalTag}  onChange={(v) => set('showAnimalTag', v)} />
          <ToggleButton label="Nome do animal"   checked={form.showAnimalName} onChange={(v) => set('showAnimalName', v)} />
          <ToggleButton label="Nome da fazenda"  checked={form.showFarmName}   onChange={(v) => set('showFarmName', v)} />
          <ToggleButton label="Borda"            checked={form.showBorder}     onChange={(v) => set('showBorder', v)} />
        </fieldset>

        {/* Cores */}
        <fieldset className="space-y-3 rounded-lg border border-border p-4">
          <legend className="px-1 text-xs font-medium text-muted-foreground">Cores</legend>
          <ColorRow label="Cor de fundo" value={form.bgColor}   onChange={(v) => set('bgColor', v)} />
          <ColorRow label="Cor do texto" value={form.textColor} onChange={(v) => set('textColor', v)} />
        </fieldset>
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={isPending || !form.name.trim()}
        >
          {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
          {initial ? 'Salvar alterações' : 'Criar modelo'}
        </Button>
      </div>
    </div>
  )
}

// ─── ColorRow ──────────────────────────────────────────────

function ColorRow({
  label,
  value,
  onChange,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-2">
        <div
          className="size-7 rounded border border-border"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-7 rounded cursor-pointer border border-border p-0.5 bg-transparent"
        />
        <Input
          type="text"
          value={value}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v)
          }}
          className="h-7 w-24 font-mono text-xs"
        />
      </div>
    </div>
  )
}
