'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckSquare, Square, Syringe, CheckCircle2, ChevronDown } from 'lucide-react'
import { createBulkVaccination } from '@/modules/health-events/actions'

// ─── Vacinas comuns pré-definidas ──────────────────────────

const VACCINE_PRESETS = [
  { label: 'Raiva',              value: 'Raiva' },
  { label: 'Mal de Ano',         value: 'Mal de Ano (Clostridiose)' },
  { label: 'Febre Aftosa',       value: 'Febre Aftosa' },
  { label: 'Brucelose',          value: 'Brucelose' },
  { label: 'Botulismo',          value: 'Botulismo' },
  { label: 'IBR / BVD',          value: 'IBR / BVD' },
  { label: 'Carbúnculo Sintom.', value: 'Carbúnculo Sintomático' },
  { label: 'Leptospirose',       value: 'Leptospirose' },
]

// ─── Types ─────────────────────────────────────────────────

export type AnimalOption = {
  id:       string
  tag:      string
  name:     string | null
  category: string
  lot:      { name: string } | null
}

interface Props {
  farmId:  string
  animals: AnimalOption[]
}

// ─── Componente ────────────────────────────────────────────

export function VaccinationBulkForm({ farmId, animals }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Seleção de animais
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [search, setSearch]        = useState('')

  // Campos do formulário
  const [description, setDescription] = useState('')
  const [customDesc, setCustomDesc]    = useState('')
  const [medication, setMedication]    = useState('')
  const [occurredAt, setOccurredAt]    = useState(() => new Date().toISOString().slice(0, 10))
  const [cost, setCost]                = useState('')
  const [notes, setNotes]              = useState('')

  // Estado de sucesso
  const [done, setDone] = useState<{ count: number; vaccine: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const filteredAnimals = useMemo(() => {
    if (!search) return animals
    const q = search.toLowerCase()
    return animals.filter(
      (a) =>
        a.tag.toLowerCase().includes(q) ||
        (a.name?.toLowerCase().includes(q) ?? false) ||
        a.lot?.name.toLowerCase().includes(q),
    )
  }, [animals, search])

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filteredAnimals.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredAnimals.map((a) => a.id)))
    }
  }

  const finalDescription = description === '__custom__' ? customDesc : description

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!finalDescription.trim()) { setError('Informe a vacina'); return }
    if (selected.size === 0)      { setError('Selecione pelo menos um animal'); return }

    startTransition(async () => {
      const result = await createBulkVaccination(
        farmId,
        Array.from(selected),
        {
          description: finalDescription.trim(),
          medication:  medication.trim() || undefined,
          occurredAt:  new Date(occurredAt + 'T12:00:00'),
          cost:        cost ? parseFloat(cost.replace(',', '.')) : undefined,
          notes:       notes.trim() || undefined,
        },
      )

      if (result.success) {
        setDone({ count: result.data.count, vaccine: finalDescription.trim() })
      } else {
        setError(result.error ?? 'Erro desconhecido')
      }
    })
  }

  // ── Tela de sucesso ────────────────────────────────────────
  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="size-8 text-emerald-500" />
        </div>
        <div>
          <p className="text-lg font-semibold">Vacinação registrada!</p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground">{done.count} animal{done.count !== 1 ? 'is' : ''}</span>
            {' '}vacinado{done.count !== 1 ? 's' : ''} contra{' '}
            <span className="font-medium text-foreground">{done.vaccine}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setDone(null); setSelected(new Set()) }}
            className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted/50 transition-colors"
          >
            Nova vacinação
          </button>
          <button
            onClick={() => router.push('/health-events?type=VACCINATION')}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ver histórico
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Vacina ─────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Vacina *</label>
        <div className="grid grid-cols-2 gap-2">
          {VACCINE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => { setDescription(p.value); setCustomDesc('') }}
              className={`
                rounded-lg border px-3 py-2.5 text-left text-sm transition-colors
                ${description === p.value
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border hover:border-primary/40 text-foreground'}
              `}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDescription('__custom__')}
            className={`
              col-span-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors flex items-center gap-2
              ${description === '__custom__'
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border hover:border-primary/40 text-muted-foreground'}
            `}
          >
            <ChevronDown className="size-4 shrink-0" />
            Outra vacina...
          </button>
        </div>
        {description === '__custom__' && (
          <input
            autoFocus
            type="text"
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder="Nome da vacina"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {/* ── Produto / fabricante ───────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Produto / fabricante <span className="text-xs">(opcional)</span>
        </label>
        <input
          type="text"
          value={medication}
          onChange={(e) => setMedication(e.target.value)}
          placeholder="Ex: Rabisin, Monovac, Sintofar..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ── Data + custo ───────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Data *</label>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Custo total <span className="text-xs">(R$, opcional)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* ── Observações ────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Observações <span className="text-xs">(opcional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lote do produto, veterinário responsável..."
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      {/* ── Seleção de animais ─────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Syringe className="size-4 text-emerald-500" />
            Animais vacinados *
            <span className="font-normal text-muted-foreground text-xs ml-1">
              {selected.size}/{animals.length}
            </span>
          </label>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-primary hover:underline"
          >
            {selected.size > 0 && selected.size === filteredAnimals.length
              ? 'Desmarcar todos'
              : 'Marcar todos'}
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por brinco, nome ou lote..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-8 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-72 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border bg-card [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40">
          {filteredAnimals.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum animal encontrado
            </div>
          ) : filteredAnimals.map((animal) => {
            const isSelected = selected.has(animal.id)
            return (
              <button
                key={animal.id}
                type="button"
                onClick={() => toggleAnimal(animal.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-left transition-colors ${
                  isSelected ? 'bg-emerald-500/5' : 'hover:bg-muted/40'
                }`}
              >
                {isSelected
                  ? <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                  : <Square className="size-4 text-muted-foreground shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold">{animal.tag}</span>
                    {animal.name && (
                      <span className="text-xs text-muted-foreground truncate">{animal.name}</span>
                    )}
                  </div>
                  {animal.lot && (
                    <span className="text-[11px] text-muted-foreground/70">{animal.lot.name}</span>
                  )}
                </div>
                <span className={`text-[11px] px-1.5 py-0.5 rounded shrink-0 ${
                  animal.category === 'COW'    ? 'bg-blue-500/10 text-blue-500' :
                  animal.category === 'HEIFER' ? 'bg-purple-500/10 text-purple-500' :
                  animal.category === 'BULL'   ? 'bg-orange-500/10 text-orange-500' :
                                                  'bg-muted text-muted-foreground'
                }`}>
                  {animal.category === 'COW'    ? 'Vaca'    :
                   animal.category === 'HEIFER' ? 'Novilha' :
                   animal.category === 'BULL'   ? 'Touro'   :
                   animal.category === 'CALF'   ? 'Bezerra' : animal.category}
                </span>
              </button>
            )
          })}
        </div>

        {selected.size > 0 && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-center text-emerald-600 dark:text-emerald-400">
            {selected.size} animal{selected.size !== 1 ? 'is' : ''} selecionado{selected.size !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Erro ───────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* ── Submit ─────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={pending || selected.size === 0 || !finalDescription.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-medium py-3 text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Syringe className="size-4" />
        {pending
          ? 'Registrando...'
          : selected.size > 0
            ? `Registrar vacinação — ${selected.size} animal${selected.size !== 1 ? 'is' : ''}`
            : 'Selecione os animais'}
      </button>
    </form>
  )
}
