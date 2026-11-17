'use client'

import { useTransition, useState } from 'react'
import { useRouter }   from 'next/navigation'
import { Loader2, CheckSquare, Square } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Input }       from '@/components/ui/input'
import { Label }       from '@/components/ui/label'
import { SectionCard } from '@/components/shared/section-card'
import { createIATFProtocol } from '@/modules/reproduction/iatf-actions'

interface Animal {
  id:       string
  tag:      string
  name:     string | null
  category: string
}

interface Props {
  animals: Animal[]
}

export function NewIATFForm({ animals }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error,   setError]        = useState<string | null>(null)

  // Campos do protocolo
  const [name,       setName]       = useState('')
  const [d0Date,     setD0Date]     = useState('')
  const [d8Date,     setD8Date]     = useState('')
  const [d10Date,    setD10Date]    = useState('')
  const [touro,      setTouro]      = useState('')
  const [dgStart,    setDgStart]    = useState('')
  const [dgEnd,      setDgEnd]      = useState('')
  const [prevParto,  setPrevParto]  = useState('')

  // Auto-calcular D8 e D10 a partir de D0
  function handleD0Change(val: string) {
    setD0Date(val)
    if (!val) return
    const d0 = new Date(val + 'T00:00:00')
    if (isNaN(d0.getTime())) return
    const d8  = new Date(d0); d8.setDate(d8.getDate() + 8)
    const d10 = new Date(d0); d10.setDate(d10.getDate() + 10)
    setD8Date(d8.toISOString().split('T')[0]!)
    setD10Date(d10.toISOString().split('T')[0]!)
  }

  // Animais selecionados
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleAnimal(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === animals.length) setSelected(new Set())
    else setSelected(new Set(animals.map((a) => a.id)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.size === 0) { setError('Selecione pelo menos um animal'); return }
    if (!d0Date)              { setError('Data D0 obrigatória'); return }
    if (!d10Date)             { setError('Data D10 (IA) obrigatória'); return }
    setError(null)

    startTransition(async () => {
      const result = await createIATFProtocol({
        name:      name || `IATF ${d10Date.slice(0, 7).replace('-', '/')}${touro ? ' — ' + touro : ''}`,
        d0Date,
        d8Date:    d8Date    || undefined,
        d10Date,
        touro:     touro     || undefined,
        dgStart:   dgStart   || undefined,
        dgEnd:     dgEnd     || undefined,
        prevParto: prevParto || undefined,
        animals: Array.from(selected).map((id) => ({ animalId: id })),
      })

      if (result.success) {
        router.push(`/reproduction/protocolos/iatf?id=${result.data.id}`)
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
              placeholder={`ex: IATF Nov/2026${touro ? ' — ' + touro : ''}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="d0Date" className="text-xs text-muted-foreground">D0 — Implante P4 *</Label>
              <Input
                id="d0Date"
                type="date"
                required
                value={d0Date}
                onChange={(e) => handleD0Change(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="d8Date" className="text-xs text-muted-foreground">D8 — Hormônios</Label>
              <Input
                id="d8Date"
                type="date"
                value={d8Date}
                onChange={(e) => setD8Date(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="d10Date" className="text-xs text-muted-foreground">D10 — IA *</Label>
              <Input
                id="d10Date"
                type="date"
                required
                value={d10Date}
                onChange={(e) => setD10Date(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="touro" className="text-xs text-muted-foreground">Sêmen / Touro</Label>
            <Input
              id="touro"
              placeholder="ex: ROZTAC-ET — Nelore PO"
              value={touro}
              onChange={(e) => setTouro(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
      </SectionCard>

      {/* DG e parto */}
      <SectionCard title="Diagnóstico e parto previstos">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">DG início</Label>
              <Input type="date" value={dgStart} onChange={(e) => setDgStart(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">DG fim</Label>
              <Input type="date" value={dgEnd} onChange={(e) => setDgEnd(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Parto previsto (padrão: IA + 280 dias)</Label>
            <Input type="date" value={prevParto} onChange={(e) => setPrevParto(e.target.value)} className="mt-1" />
          </div>
        </div>
      </SectionCard>

      {/* Seleção de animais */}
      <SectionCard
        title="Animais"
        subtitle={`${selected.size} selecionados de ${animals.length} elegíveis`}
        noPadding
      >
        {animals.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">
            Nenhum animal elegível — todas as fêmeas já estão em protocolo IATF ativo.
          </p>
        ) : (
          <>
            <div
              className="flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b border-border/40 hover:bg-muted/20"
              onClick={toggleAll}
            >
              {selected.size === animals.length
                ? <CheckSquare className="size-4 text-primary shrink-0" />
                : <Square className="size-4 text-muted-foreground shrink-0" />}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Selecionar todos
              </span>
            </div>

            <div className="divide-y divide-border/40">
              {[
                { label: 'Vacas',     list: cows },
                { label: 'Novilhas',  list: heifers },
              ].filter((g) => g.list.length > 0).map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    {group.label}
                  </div>
                  {group.list.map((animal) => {
                    const isSelected = selected.has(animal.id)
                    return (
                      <div
                        key={animal.id}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
                        }`}
                        onClick={() => toggleAnimal(animal.id)}
                      >
                        {isSelected
                          ? <CheckSquare className="size-4 text-primary shrink-0" />
                          : <Square className="size-4 text-muted-foreground shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{animal.tag}</span>
                          {animal.name && (
                            <span className="text-xs text-muted-foreground ml-2">{animal.name}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {error && (
        <p className="text-sm text-destructive px-1">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={pending || selected.size === 0}>
        {pending
          ? <><Loader2 className="size-4 mr-2 animate-spin" /> Criando...</>
          : `Criar protocolo com ${selected.size} animal${selected.size !== 1 ? 'is' : ''}`}
      </Button>
    </form>
  )
}
