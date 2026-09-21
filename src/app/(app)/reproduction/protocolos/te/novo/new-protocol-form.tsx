'use client'

import { useTransition, useState } from 'react'
import { useRouter }   from 'next/navigation'
import { Loader2, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { SectionCard } from '@/components/shared/section-card'
import { createTEProtocol } from '@/modules/reproduction/te-actions'

interface Animal {
  id:       string
  tag:      string
  name:     string | null
  category: string
}

interface Props {
  animals: Animal[]
}

interface SelectedAnimal {
  animalId:   string
  donor?:     string
  ovaQuality?: string
  sexo?:      string
}

export function NewProtocolForm({ animals }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)

  // Campos do protocolo
  const [name,        setName]        = useState('')
  const [opuDate,     setOpuDate]     = useState('')
  const [teDate,      setTeDate]      = useState('')
  const [laboratorio, setLaboratorio] = useState('')
  const [touro,       setTouro]       = useState('')
  const [doadoras,    setDoadoras]    = useState('')
  const [dgP30Start,  setDgP30Start]  = useState('')
  const [dgP30End,    setDgP30End]    = useState('')
  const [dgP60Start,  setDgP60Start]  = useState('')
  const [dgP60End,    setDgP60End]    = useState('')
  const [prevParto,   setPrevParto]   = useState('')

  // Animais selecionados
  const [selected, setSelected] = useState<Map<string, SelectedAnimal>>(new Map())
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null)

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
        if (expandedAnimal === id) setExpandedAnimal(null)
      } else {
        next.set(id, { animalId: id })
      }
      return next
    })
  }

  function updateAnimalData(id: string, field: keyof Omit<SelectedAnimal, 'animalId'>, value: string) {
    setSelected((prev) => {
      const next    = new Map(prev)
      const current = next.get(id)
      if (current) next.set(id, { ...current, [field]: value || undefined })
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) { setError('Selecione pelo menos uma receptora'); return }
    setError(null)

    startTransition(async () => {
      const result = await createTEProtocol({
        name:        name || `TE ${teDate.slice(0, 7).replace('-', '/')} — ${touro}`,
        opuDate,
        teDate,
        laboratorio,
        touro,
        doadoras:   doadoras   || undefined,
        dgP30Start: dgP30Start || undefined,
        dgP30End:   dgP30End   || undefined,
        dgP60Start: dgP60Start || undefined,
        dgP60End:   dgP60End   || undefined,
        prevParto:  prevParto  || undefined,
        animals: Array.from(selected.values()),
      })

      if (result.success) {
        router.push(`/reproduction/protocolos/te?id=${result.data.id}`)
      } else {
        setError(result.error ?? 'Erro ao criar protocolo')
      }
    })
  }

  const heifers = animals.filter((a) => a.category === 'HEIFER')
  const cows    = animals.filter((a) => a.category === 'COW')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Dados do protocolo */}
      <SectionCard title="Dados do protocolo">
        <div className="space-y-3">
          <div>
            <Label htmlFor="name" className="text-xs text-muted-foreground">Nome (opcional)</Label>
            <Input
              id="name"
              placeholder="ex: TE Out/2026 — ROZTAC-ET"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="opuDate" className="text-xs text-muted-foreground">Data OPU *</Label>
              <Input
                id="opuDate"
                type="date"
                required
                value={opuDate}
                onChange={(e) => setOpuDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="teDate" className="text-xs text-muted-foreground">Data TE *</Label>
              <Input
                id="teDate"
                type="date"
                required
                value={teDate}
                onChange={(e) => setTeDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="touro" className="text-xs text-muted-foreground">Touro *</Label>
            <Input
              id="touro"
              placeholder="ex: ROZTAC-ET (HOBRAM01420)"
              required
              value={touro}
              onChange={(e) => setTouro(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="laboratorio" className="text-xs text-muted-foreground">Laboratório *</Label>
            <Input
              id="laboratorio"
              placeholder="ex: Eleva Embriões Ltda"
              required
              value={laboratorio}
              onChange={(e) => setLaboratorio(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="doadoras" className="text-xs text-muted-foreground">Doadoras</Label>
            <Input
              id="doadoras"
              placeholder="ex: AMARILIS EMO 73 / URBANISTA FIV PRLB"
              value={doadoras}
              onChange={(e) => setDoadoras(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </SectionCard>

      {/* Datas DG */}
      <SectionCard title="Diagnósticos previstos">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">DG P30 início</Label>
              <Input type="date" value={dgP30Start} onChange={(e) => setDgP30Start(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">DG P30 fim</Label>
              <Input type="date" value={dgP30End} onChange={(e) => setDgP30End(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">DG P60 início</Label>
              <Input type="date" value={dgP60Start} onChange={(e) => setDgP60Start(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">DG P60 fim</Label>
              <Input type="date" value={dgP60End} onChange={(e) => setDgP60End(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Parto previsto</Label>
            <Input type="date" value={prevParto} onChange={(e) => setPrevParto(e.target.value)} className="mt-1" />
          </div>
        </div>
      </SectionCard>

      {/* Seleção de animais */}
      <SectionCard
        title="Receptoras"
        subtitle={`${selected.size} selecionadas de ${animals.length} elegíveis`}
        noPadding
      >
        {animals.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            Nenhum animal elegível — todas as fêmeas já estão em protocolo ativo.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {[
              { label: 'Vacas', list: cows },
              { label: 'Novilhas', list: heifers },
            ].filter((g) => g.list.length > 0).map((group) => (
              <div key={group.label}>
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                  {group.label}
                </div>
                {group.list.map((animal) => {
                  const isSelected = selected.has(animal.id)
                  const isExpanded = expandedAnimal === animal.id && isSelected
                  const data       = selected.get(animal.id)

                  return (
                    <div key={animal.id} className="border-b border-border/20 last:border-0">
                      <div
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-violet-500/5' : 'hover:bg-muted/20'
                        }`}
                        onClick={() => toggleAnimal(animal.id)}
                      >
                        {isSelected
                          ? <CheckSquare className="size-4 text-violet-500 shrink-0" />
                          : <Square className="size-4 text-muted-foreground shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{animal.tag}</span>
                          {animal.name && (
                            <span className="text-xs text-muted-foreground ml-2">{animal.name}</span>
                          )}
                        </div>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setExpandedAnimal(isExpanded ? null : animal.id) }}
                            className="text-muted-foreground p-1"
                          >
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </button>
                        )}
                      </div>

                      {isExpanded && isSelected && (
                        <div
                          className="px-4 pb-3 grid grid-cols-3 gap-2 bg-violet-500/5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div>
                            <Label className="text-xs text-muted-foreground">Doadora</Label>
                            <Input
                              placeholder="ex: AMARILIS"
                              value={data?.donor ?? ''}
                              onChange={(e) => updateAnimalData(animal.id, 'donor', e.target.value)}
                              className="mt-1 h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Qualidade</Label>
                            <Input
                              placeholder="ex: D2"
                              value={data?.ovaQuality ?? ''}
                              onChange={(e) => updateAnimalData(animal.id, 'ovaQuality', e.target.value)}
                              className="mt-1 h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Sexo</Label>
                            <Input
                              placeholder="BX / BL"
                              value={data?.sexo ?? ''}
                              onChange={(e) => updateAnimalData(animal.id, 'sexo', e.target.value)}
                              className="mt-1 h-8 text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {error && (
        <p className="text-sm text-destructive px-1">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending || selected.size === 0}>
        {pending
          ? <><Loader2 className="size-4 mr-2 animate-spin" /> Criando...</>
          : `Criar protocolo com ${selected.size} receptoras`}
      </Button>
    </form>
  )
}
