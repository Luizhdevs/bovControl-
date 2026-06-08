'use client'

import { useState } from 'react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Label }    from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileDown, Search } from 'lucide-react'
import type { EarTagTemplateItem, AnimalForEarTag } from '../types'

interface PrintFormProps {
  templates: EarTagTemplateItem[]
  animals:   AnimalForEarTag[]
  /** templateId pré-selecionado (via searchParam) */
  defaultTemplateId?: string
  /** animalId único pré-selecionado (via searchParam) */
  defaultAnimalId?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  COW:    'Vaca',
  HEIFER: 'Novilha',
  CALF:   'Bezerra',
  BULL:   'Touro',
  OX:     'Boi',
}

export function PrintForm({
  templates,
  animals,
  defaultTemplateId,
  defaultAnimalId,
}: PrintFormProps) {
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id ?? '')
  const [selected,   setSelected]   = useState<Set<string>>(
    defaultAnimalId ? new Set([defaultAnimalId]) : new Set(),
  )
  const [copies,     setCopies]     = useState(1)
  const [search,     setSearch]     = useState('')

  const filtered = animals.filter((a) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.tag.toLowerCase().includes(q) ||
      (a.name?.toLowerCase().includes(q) ?? false) ||
      (a.lot?.name.toLowerCase().includes(q) ?? false)
    )
  })

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((a) => a.id)))
    }
  }

  function buildPdfUrl() {
    const ids = Array.from(selected).join(',')
    return `/api/ear-tags/pdf?templateId=${templateId}&animalIds=${ids}&copies=${copies}`
  }

  const canPrint = templateId && selected.size > 0

  return (
    <div className="space-y-5">
      {/* Seleção de modelo */}
      <div className="space-y-1.5">
        <Label>Modelo de etiqueta</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Selecionar modelo..." />
          </SelectTrigger>
          <SelectContent>
            {templates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} — {t.widthMm}×{t.heightMm} mm
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cópias */}
      <div className="space-y-1.5">
        <Label>Cópias por animal</Label>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCopies(n)}
              className={`
                size-10 rounded-lg border text-sm font-medium transition-colors
                ${copies === n
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground'}
              `}
            >
              {n}
            </button>
          ))}
          <Input
            type="number"
            min={1}
            max={10}
            value={copies}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1 && v <= 10) setCopies(v)
            }}
            className="h-10 w-16 text-center"
          />
        </div>
      </div>

      {/* Seleção de animais */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Animais ({selected.size} selecionado{selected.size !== 1 ? 's' : ''})</Label>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-primary hover:underline"
          >
            {selected.size === filtered.length && filtered.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por brinco, nome ou lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Lista */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum animal encontrado</p>
          ) : (
            filtered.map((animal) => {
              const isChecked = selected.has(animal.id)
              return (
                <label
                  key={animal.id}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors
                    ${isChecked ? 'bg-primary/5' : 'hover:bg-muted/50'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleAnimal(animal.id)}
                    className="size-4 rounded border-border accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-sm font-medium">{animal.tag}</span>
                    {animal.name && (
                      <span className="text-muted-foreground text-sm ml-1.5">{animal.name}</span>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {CATEGORY_LABELS[animal.category] ?? animal.category}
                      {animal.lot && ` · ${animal.lot.name}`}
                    </div>
                  </div>
                </label>
              )
            })
          )}
        </div>
      </div>

      {/* Botão de gerar PDF */}
      <Button
        className="w-full h-12 text-base"
        disabled={!canPrint}
        asChild={Boolean(canPrint)}
      >
        {canPrint ? (
          <a href={buildPdfUrl()} target="_blank" rel="noopener noreferrer">
            <FileDown className="size-4 mr-2" />
            Gerar PDF ({selected.size} etiqueta{selected.size !== 1 ? 's' : ''} × {copies} {copies === 1 ? 'cópia' : 'cópias'})
          </a>
        ) : (
          <span>
            <FileDown className="size-4 mr-2" />
            Gerar PDF
          </span>
        )}
      </Button>

      {selected.size > 0 && (
        <p className="text-[11px] text-center text-muted-foreground -mt-3">
          Total: {selected.size * copies} etiqueta{selected.size * copies !== 1 ? 's' : ''} no PDF
        </p>
      )}
    </div>
  )
}
