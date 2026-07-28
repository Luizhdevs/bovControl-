'use client'

import { useState } from 'react'
import { Baby }     from 'lucide-react'
import { StillbirthSheet } from './stillbirth-sheet'
import { Button }          from '@/components/ui/button'

interface StillbirthButtonProps {
  animalId:   string
  animalTag:  string
  animalName: string | null
  calveId:    string
  calveTag:   string
}

export function StillbirthButton({
  animalId, animalTag, animalName, calveId, calveTag,
}: StillbirthButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
        title="Bezerro nasceu morto"
      >
        <Baby className="size-3 mr-1" />
        Natimorto
      </Button>

      <StillbirthSheet
        open={open}
        onClose={() => setOpen(false)}
        animalId={animalId}
        animalTag={animalTag}
        animalName={animalName}
        calveId={calveId}
        calveTag={calveTag}
      />
    </>
  )
}
