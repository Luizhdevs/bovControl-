'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────

export interface QuickAction {
  id:              string
  icon:            LucideIcon
  label:           string
  onClick?:        () => void
  href?:           string
  disabled?:       boolean
  disabledReason?: string
  highlight?:      boolean   // Destaque visual (ex: ação pendente)
  badge?:          string    // Contador ou indicador
}

interface QuickActionBarProps {
  actions:    QuickAction[]
  className?: string
}

// ─── Botão individual ──────────────────────────────────────

function QuickActionButton({ action }: { action: QuickAction }) {
  const Icon = action.icon

  const content = (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5',
        'min-w-[64px] px-1',
        'opacity-100',
        action.disabled && 'opacity-40',
      )}
    >
      {/* Ícone com fundo */}
      <div className="relative">
        <div
          className={cn(
            'size-12 rounded-xl flex items-center justify-center',
            'border transition-all duration-150',
            'active:scale-90',
            action.highlight
              ? 'bg-primary/15 border-primary/40 text-primary'
              : 'bg-card border-border text-muted-foreground',
            !action.disabled && 'hover:border-primary/30 hover:text-foreground',
          )}
        >
          <Icon className="size-5" />
        </div>

        {/* Badge de contador */}
        {action.badge && (
          <span
            className={cn(
              'absolute -top-1 -right-1',
              'min-w-[18px] h-[18px] px-1',
              'rounded-full text-[10px] font-bold',
              'flex items-center justify-center',
              'bg-primary text-primary-foreground',
            )}
          >
            {action.badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="text-[11px] text-muted-foreground text-center leading-tight">
        {action.label}
      </span>
    </div>
  )

  if (action.disabled) {
    return (
      <button
        type="button"
        disabled
        title={action.disabledReason}
        className="cursor-not-allowed"
      >
        {content}
      </button>
    )
  }

  if (action.href) {
    return (
      <a href={action.href} className="focus:outline-none">
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      onClick={action.onClick}
      className="focus:outline-none"
    >
      {content}
    </button>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Barra de ações rápidas horizontal com scroll.
 * Exibe ícone + label para cada ação, com área de toque adequada.
 * Ações desabilitadas são exibidas com opacidade reduzida.
 *
 * Mobile-first: scroll horizontal suave, ícones grandes (48px).
 */
export function QuickActionBar({ actions, className }: QuickActionBarProps) {
  return (
    <div
      className={cn(
        'flex gap-1 overflow-x-auto pb-1 scrollbar-none',
        '-mx-4 px-4',   // Sangra até as bordas no mobile
        className,
      )}
    >
      {actions.map((action) => (
        <QuickActionButton key={action.id} action={action} />
      ))}
    </div>
  )
}
