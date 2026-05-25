'use client'

/**
 * Centraliza todas as ações interativas da página de detalhe do lote.
 * Análogo a AnimalQuickActions do módulo Animals.
 *
 * Gerencia:
 * - TransferAnimalDialog (adicionar animal ao lote)
 * - MobileBottomActions (Editar Lote + Adicionar Animal)
 */

import { useState }                  from 'react'
import { Edit2, Plus }               from 'lucide-react'
import { MobileBottomActions }       from '@/components/shared/mobile-bottom-actions'
import { TransferAnimalDialog }      from './transfer-animal-dialog'
import type { AnimalInLot, LotWithDetails } from '../types'

interface LotPageActionsProps {
  lot:              Pick<LotWithDetails, 'id' | 'name' | 'type' | 'isActive'>
  farmId:           string
  availableAnimals: AnimalInLot[]
  userRole:         string
}

export function LotPageActions({
  lot,
  farmId,
  availableAnimals,
  userRole,
}: LotPageActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const canManage = ['OWNER', 'MANAGER', 'WORKER'].includes(userRole)

  return (
    <>
      {/* Barra fixa de ações do rodapé */}
      {lot.isActive && (
        <MobileBottomActions
          primary={[
            {
              label:   'Editar Lote',
              icon:    Edit2,
              href:    `/lots/${lot.id}/edit`,
              variant: 'outline',
            },
            {
              label:    'Adicionar Animal',
              icon:     Plus,
              onClick:  () => setDialogOpen(true),
              disabled: !canManage || availableAnimals.length === 0,
              disabledReason: availableAnimals.length === 0
                ? 'Todos os animais já estão neste lote'
                : undefined,
            },
          ]}
        />
      )}

      {/* Sheet de transferência de animal */}
      <TransferAnimalDialog
        farmId={farmId}
        targetLotId={lot.id}
        targetLotName={lot.name}
        targetLotType={lot.type}
        availableAnimals={availableAnimals}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  )
}
