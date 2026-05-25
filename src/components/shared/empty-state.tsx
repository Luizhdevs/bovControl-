import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EmptyStateProps {
  icon:        React.ReactNode
  title:       string
  description: string
  action?:     {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

/**
 * Estado vazio padrão — usado quando uma lista não tem resultados.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        className,
      )}
    >
      <div className="text-muted-foreground/50 mb-4 [&>svg]:size-12">
        {icon}
      </div>

      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>

      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild size="lg">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button size="lg" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
