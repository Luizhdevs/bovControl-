import { PawPrint } from 'lucide-react'
import { AnimalCard, DESKTOP_COLS } from './animal-card'
import { EmptyState } from '@/components/shared/empty-state'
import { cn } from '@/lib/utils'
import type { AnimalListItem } from '../types'

interface AnimalListProps {
  animals:    AnimalListItem[]
  isFiltered?: boolean
}

export function AnimalList({ animals, isFiltered }: AnimalListProps) {
  if (animals.length === 0) {
    return (
      <EmptyState
        icon={<PawPrint />}
        title={isFiltered ? 'Nenhum animal encontrado' : 'Nenhum animal cadastrado'}
        description={
          isFiltered
            ? 'Tente ajustar os filtros para encontrar o animal.'
            : 'Cadastre o primeiro animal da fazenda para começar.'
        }
        action={
          !isFiltered
            ? { label: 'Cadastrar Animal', href: '/animals/new' }
            : undefined
        }
      />
    )
  }

  return (
    <>
      {/* ── MOBILE: grade de cards ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {animals.map((animal) => (
          <AnimalCard key={animal.id} animal={animal} />
        ))}
      </div>

      {/* ── DESKTOP: tabela com cabeçalho fixo ───────────── */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        {/* Cabeçalho */}
        <div className={cn(
          'grid gap-4 px-4 py-2.5 items-center',
          'bg-muted/50 border-b border-border',
          'text-[11px] font-semibold uppercase tracking-wider text-muted-foreground',
          DESKTOP_COLS,
        )}>
          <div /> {/* avatar */}
          <div>Brinco</div>
          <div>Nome</div>
          <div>Categoria</div>
          <div>Raça</div>
          <div>Lote</div>
          <div>Idade</div>
          <div />
        </div>

        {/* Linhas */}
        <div className="divide-y divide-border">
          {animals.map((animal) => (
            <AnimalCard key={animal.id} animal={animal} />
          ))}
        </div>
      </div>
    </>
  )
}
