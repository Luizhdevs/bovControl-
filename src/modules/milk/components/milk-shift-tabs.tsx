'use client'

import { cn } from '@/lib/utils'
import { MILK_SHIFT_LABELS } from '@/modules/shared/domain/animal-labels'
import { SHIFT_EMOJIS } from '../constants'

// ─── Helper: shift padrão pelo horário atual ───────────────

export function getDefaultShift(): 'MORNING' | 'AFTERNOON' | 'EVENING' {
  const hour = new Date().getHours()
  if (hour < 12) return 'MORNING'
  if (hour < 18) return 'AFTERNOON'
  return 'EVENING'
}

// ─── Componente ────────────────────────────────────────────

interface MilkShiftTabsProps {
  value:      string
  onChange:   (value: 'MORNING' | 'AFTERNOON' | 'EVENING') => void
  className?: string
  disabled?:  boolean
}

export function MilkShiftTabs({
  value,
  onChange,
  className,
  disabled,
}: MilkShiftTabsProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>
      {(['MORNING', 'AFTERNOON', 'EVENING'] as const).map((shift) => (
        <button
          key={shift}
          type="button"
          disabled={disabled}
          onClick={() => onChange(shift)}
          className={cn(
            'rounded-xl border py-3 flex flex-col items-center gap-1',
            'text-sm font-medium transition-all duration-150',
            'active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
            'min-h-[68px]',
            value === shift
              ? 'border-primary bg-primary/10 text-primary shadow-sm'
              : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-muted/50',
          )}
        >
          <span className="text-xl leading-none">{SHIFT_EMOJIS[shift]}</span>
          <span className="text-xs">{MILK_SHIFT_LABELS[shift]}</span>
        </button>
      ))}
    </div>
  )
}
