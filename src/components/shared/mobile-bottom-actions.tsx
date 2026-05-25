'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

// ─── Tipos ─────────────────────────────────────────────────

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'

export interface BottomAction {
  label:           string
  icon?:           LucideIcon
  variant?:        ButtonVariant
  href?:           string
  onClick?:        () => void
  disabled?:       boolean
  disabledReason?: string   // Exibido abaixo do botão quando disabled=true
  className?:      string
}

interface MobileBottomActionsProps {
  /** Ações principais — exibidas em linha (1 ou 2 botões grandes) */
  primary:    BottomAction[]
  /** Ações secundárias — exibidas em linha menor abaixo das primárias */
  secondary?: BottomAction[]
  className?: string
}

// ─── Botão individual ──────────────────────────────────────

function ActionButton({ action }: { action: BottomAction }) {
  const Icon    = action.icon
  const content = (
    <>
      {Icon && <Icon className="size-4 mr-2 shrink-0" />}
      {action.label}
    </>
  )

  const buttonProps = {
    variant:   (action.variant ?? 'default') as ButtonVariant,
    disabled:  action.disabled,
    className: cn('flex-1 h-12 text-base', action.className),
  }

  if (action.href && !action.disabled) {
    return (
      <Button {...buttonProps} asChild>
        <Link href={action.href}>{content}</Link>
      </Button>
    )
  }

  return (
    <Button {...buttonProps} onClick={action.onClick}>
      {content}
    </Button>
  )
}

// ─── Componente principal ──────────────────────────────────

/**
 * Barra de ações fixada no rodapé — padrão mobile-first.
 *
 * Uso no animal detail:
 * <MobileBottomActions
 *   primary={[
 *     { label: 'Editar', icon: Edit2, href: `/animals/${id}/edit` },
 *     { label: 'Trocar Lote', icon: ArrowLeftRight, onClick: openSheet },
 *   ]}
 *   secondary={[
 *     { label: 'Vendido', variant: 'outline', onClick: ..., disabled: !canSell, disabledReason: '...' },
 *     { label: 'Óbito', variant: 'outline', onClick: ..., className: 'text-destructive' },
 *   ]}
 * />
 */
export function MobileBottomActions({
  primary,
  secondary,
  className,
}: MobileBottomActionsProps) {
  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-20',
        'bg-background/95 backdrop-blur-md',
        'border-t border-border',
        'px-4 pt-3 pb-safe-bottom',
        // Adiciona padding extra no iOS (safe area)
        'pb-4',
        className,
      )}
    >
      {/* Ações primárias */}
      {primary.length > 0 && (
        <div className="flex gap-2 mb-2">
          {primary.map((action, i) => (
            <div key={i} className="flex-1 flex flex-col">
              <ActionButton action={action} />
              {action.disabled && action.disabledReason && (
                <p className="text-[10px] text-muted-foreground text-center mt-1 leading-tight px-1">
                  {action.disabledReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ações secundárias */}
      {secondary && secondary.length > 0 && (
        <div className="flex gap-2">
          {secondary.map((action, i) => (
            <div key={i} className="flex-1 flex flex-col">
              <Button
                variant={action.variant ?? 'outline'}
                disabled={action.disabled}
                onClick={action.onClick}
                className={cn('flex-1 h-10 text-sm', action.className)}
              >
                {action.icon && <action.icon className="size-3.5 mr-1.5 shrink-0" />}
                {action.label}
              </Button>
              {action.disabled && action.disabledReason && (
                <p className="text-[10px] text-muted-foreground text-center mt-1 leading-tight px-1">
                  {action.disabledReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
