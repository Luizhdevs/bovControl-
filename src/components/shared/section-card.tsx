import { cn } from '@/lib/utils'

interface SectionCardProps {
  title:      string
  subtitle?:  string
  action?:    React.ReactNode
  className?: string
  children:   React.ReactNode
  noPadding?: boolean
}

/**
 * Card padrão de seção para páginas de detalhes.
 * Substitui o pattern "div.rounded-xl.border.bg-card.p-4" repetido.
 * Mobile-first: padding confortável, área de toque adequada.
 */
export function SectionCard({
  title,
  subtitle,
  action,
  className,
  children,
  noPadding,
}: SectionCardProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Divisor */}
      <div className="border-t border-border/50" />

      {/* Conteúdo */}
      <div className={cn(!noPadding && 'p-4')}>{children}</div>
    </div>
  )
}

// ─── InfoRow dentro de SectionCard ────────────────────────

interface InfoRowProps {
  label:      string
  value:      React.ReactNode
  highlight?: boolean
  className?: string
}

/**
 * Linha de informação padrão dentro de SectionCard.
 * Label à esquerda, valor à direita.
 */
export function InfoRow({ label, value, highlight, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-2.5', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          'text-sm font-medium text-right max-w-[60%]',
          highlight ? 'text-primary font-semibold' : 'text-foreground',
        )}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Wrapper para múltiplas InfoRows com divisores automáticos.
 */
export function InfoRows({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border/40">{children}</div>
}
