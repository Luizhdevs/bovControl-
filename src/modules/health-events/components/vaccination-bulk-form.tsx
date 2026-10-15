'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckSquare, Square, Syringe, CheckCircle2, Plus, X } from 'lucide-react'
import { createBulkVaccination } from '@/modules/health-events/actions'

// ─── Vacinas pré-definidas ─────────────────────────────────

const VACCINE_PRESETS = [
  'Raiva',
  'Mal de Ano (Clostridiose)',
  'Febre Aftosa',
  'Brucelose',
  'Botulismo',
  'IBR / BVD',
  'Carbúnculo Sintomático',
  'Leptospirose',
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

  // Seleção de vacinas (múltiplas)
  const [selectedVaccines, setSelectedVaccines] = useState<Set<string>>(new Set())
  const [customVaccine, setCustomVaccine]       = useState('')
  const [showCustom, setShowCustom]             = useState(false)

  // Seleção de animais
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch]     = useState('')

  // Campos do formulário
  const [medication, setMedication] = useState('')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [cost, setCost]             = useState('')
  const [notes, setNotes]           = useState('')

  // Feedback
  const [done, setDone]   = useState<{ count: number; vaccines: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Vacinas finais (presets selecionados + custom se preenchido)
  const allVaccines = useMemo(() => {
    const list = Array.from(selectedVaccines)
    const custom = customVaccine.trim()
    if (custom && !list.includes(custom)) list.push(custom)
    return list
  }, [selectedVaccines, customVaccine])

  const filteredAnimals = useMemo(() => {
    if (!search) return animals
    const q = search.toLowerCase()
    return animals.filter(
      (a) =>
        a.tag.toLowerCase().includes(q) ||
        (a.name?.toLowerCase().includes(q) ?? false) ||
        (a.lot?.name.toLowerCase().includes(q) ?? false),
    )
  }, [animals, search])

  function toggleVaccine(v: string) {
    setSelectedVaccines((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllAnimals() {
    if (selected.size === filteredAnimals.length && filteredAnimals.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredAnimals.map((a) => a.id)))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (allVaccines.length === 0) { setError('Selecione pelo menos uma vacina'); return }
    if (selected.size === 0)      { setError('Selecione pelo menos um animal');  return }

    startTransition(async () => {
      const result = await createBulkVaccination(
        farmId,
        Array.from(selected),
        {
          descriptions: allVaccines,
          medication:   medication.trim() || undefined,
          occurredAt:   new Date(occurredAt + 'T12:00:00'),
          cost:         cost ? parseFloat(cost.replace(',', '.')) : undefined,
          notes:        notes.trim() || undefined,
        },
      )

      if (result.success) {
        setDone({ count: result.data.count, vaccines: allVaccines })
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
            <span className="font-medium text-foreground">{done.count} registro{done.count !== 1 ? 's' : ''}</span>
            {' '}criado{done.count !== 1 ? 's' : ''} — {done.vaccines.join(', ')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setDone(null); setSelected(new Set()); setSelectedVaccines(new Set()); setCustomVaccine('') }}
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

  const totalRecords = selected.size * allVaccines.length

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Vacinas (multi-seleção) ────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">
            Vacinas *
            {allVaccines.length > 0 && (
              <span className="ml-2 font-normal text-xs text-emerald-600 dark:text-emerald-400">
                {allVaccines.length} selecionada{allVaccines.length !== 1 ? 's' : ''}
              </span>
            )}
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {VACCINE_PRESETS.map((v) => {
            const active = selectedVaccines.has(v)
            return (
              <button
                key={v}
                type="button"
                onClick={() => toggleVaccine(v)}
                className={`
                  relative rounded-lg border px-3 py-2.5 text-left text-sm transition-colors
                  ${active
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'border-border hover:border-emerald-500/40 text-foreground'}
                `}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">✓</span>
                  </span>
                )}
                {v.replace(' (Clostridiose)', '')}
              </button>
            )
          })}
        </div>

        {/* Campo personalizado */}
        {showCustom ? (
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              value={customVaccine}
              onChange={(e) => setCustomVaccine(e.target.value)}
              placeholder="Nome da vacina personalizada"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => { setShowCustom(false); setCustomVaccine('') }}
              className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Plus className="size-3.5" />
            Adicionar outra vacina
          </button>
        )}

        {/* Resumo das selecionadas */}
        {allVaccines.length > 0 && (
          <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Vacinas selecionadas:</p>
            <div className="flex flex-wrap gap-1.5">
              {allVaccines.map((v) => (
                <span
                  key={v}
                  className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full"
                >
                  {v}
                  <button
                    type="button"
                    onClick={() => {
                      if (VACCINE_PRESETS.includes(v)) toggleVaccine(v)
                      else { setCustomVaccine(''); setShowCustom(false) }
                    }}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
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
            Animais *
            <span className="font-normal text-muted-foreground text-xs ml-1">
              {selected.size}/{animals.length}
            </span>
          </label>
          <button
            type="button"
            onClick={toggleAllAnimals}
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
      </div>

      {/* ── Preview do total ───────────────────────────────── */}
      {totalRecords > 0 && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300 text-center">
          <span className="font-bold tabular-nums">{selected.size}</span> animal{selected.size !== 1 ? 'is' : ''}
          {' '}×{' '}
          <span className="font-bold tabular-nums">{allVaccines.length}</span> vacina{allVaccines.length !== 1 ? 's' : ''}
          {' '}={' '}
          <span className="font-bold tabular-nums">{totalRecords}</span> registro{totalRecords !== 1 ? 's' : ''}
        </div>
      )}

      {/* ── Erro ───────────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      {/* ── Submit ─────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={pending || allVaccines.length === 0 || selected.size === 0}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white font-medium py-3 text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Syringe className="size-4" />
        {pending
          ? 'Registrando...'
          : totalRecords > 0
            ? `Registrar ${totalRecords} vacinação${totalRecords !== 1 ? 'ões' : ''}`
            : 'Selecione vacinas e animais'}
      </button>
    </form>
  )
}
