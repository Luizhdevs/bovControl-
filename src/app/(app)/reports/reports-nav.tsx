import Link  from 'next/link'
import { cn } from '@/lib/utils'

const TABS = [
  { key: 'farm-activity', label: 'Movimentação',       href: '/reports/farm-activity' },
  { key: 'empty-cows',   label: 'Vacas Vazias',        href: '/reports/empty-cows'   },
]

export function ReportsNav({ active }: { active: 'farm-activity' | 'empty-cows' }) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
            active === tab.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
