'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTransition }                            from 'react'
import { cn }                                       from '@/lib/utils'
import {
  ALL_ENTITIES,
  ALL_ACTIONS,
  ENTITY_LABELS,
  ACTION_LABELS,
  ACTION_BADGE_CLASSES,
  PERIOD_OPTIONS,
} from '../types'

interface AuditLogFiltersProps {
  users:       { id: string; name: string }[]
  currentFilters: {
    entity?:  string
    action?:  string
    userId?:  string
    period?:  string
  }
}

export function AuditLogFilters({ users, currentFilters }: AuditLogFiltersProps) {
  const router     = useRouter()
  const pathname   = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  function filterUrl(key: string, value: string | undefined) {
    const sp = new URLSearchParams(searchParams.toString())
    if (!value || value === '__all__') {
      sp.delete(key)
    } else {
      sp.set(key, value)
    }
    sp.delete('page')
    return `${pathname}?${sp.toString()}`
  }

  function setFilter(key: string, value: string | undefined) {
    startTransition(() => {
      router.replace(filterUrl(key, value), { scroll: false })
    })
  }

  return (
    <div className="space-y-3">
      {/* ── Entidade ──────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Pill
          active={!currentFilters.entity}
          onClick={() => setFilter('entity', undefined)}
        >
          Todos
        </Pill>
        {ALL_ENTITIES.map((e) => (
          <Pill
            key={e}
            active={currentFilters.entity === e}
            onClick={() => setFilter('entity', e)}
          >
            {ENTITY_LABELS[e] ?? e}
          </Pill>
        ))}
      </div>

      {/* ── Ação ──────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Pill
          active={!currentFilters.action}
          onClick={() => setFilter('action', undefined)}
        >
          Todas ações
        </Pill>
        {ALL_ACTIONS.map((a) => (
          <Pill
            key={a}
            active={currentFilters.action === a}
            onClick={() => setFilter('action', a)}
            badgeClass={ACTION_BADGE_CLASSES[a]}
          >
            {ACTION_LABELS[a] ?? a}
          </Pill>
        ))}
      </div>

      {/* ── Período + Usuário ─────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Período */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Pill
            active={!currentFilters.period}
            onClick={() => setFilter('period', undefined)}
          >
            Todo período
          </Pill>
          {PERIOD_OPTIONS.map((p) => (
            <Pill
              key={p.value}
              active={currentFilters.period === p.value}
              onClick={() => setFilter('period', p.value)}
            >
              {p.label}
            </Pill>
          ))}
        </div>

        {/* Usuário — apenas se houver mais de um */}
        {users.length > 1 && (
          <select
            value={currentFilters.userId ?? ''}
            onChange={(e) => setFilter('userId', e.target.value || undefined)}
            className="h-8 rounded-full border border-border bg-card px-3 text-xs font-medium text-foreground shrink-0 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos usuários</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}

// ─── Pill helper ───────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
  badgeClass,
}: {
  active:      boolean
  onClick:     () => void
  children:    React.ReactNode
  badgeClass?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
        active
          ? badgeClass
            ? cn('border-transparent', badgeClass)
            : 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
