import { PawPrint } from 'lucide-react'
import { AnimalCard } from './animal-card'
import { EmptyState } from '@/components/shared/empty-state'
import type { AnimalListItem } from '../types'

interface AnimalListProps {
  animals:    AnimalListItem[]
  isFiltered?: boolean
}

/**
 * Renderiza a grade de cards de animais.
 * Grid responsivo: 1 coluna no mobile, 2 no tablet, 3 no desktop.
 */
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {animals.map((animal) => (
        <AnimalCard key={animal.id} animal={animal} />
      ))}
    </div>
  )
}
