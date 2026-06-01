import { Suspense }        from 'react'
import { redirect }        from 'next/navigation'
import Link                from 'next/link'
import { ClipboardList }   from 'lucide-react'
import { auth }            from '@/lib/auth'
import { getActiveFarm }   from '@/lib/active-farm'
import { PageHeader }      from '@/components/shared/page-header'
import { EmptyState }      from '@/components/shared/empty-state'
import { getAuditLogs, getAuditLogUsers } from '@/modules/audit/queries'
import { AuditLogFilters } from '@/modules/audit/components/audit-log-filters'
import { AuditLogItemRow } from '@/modules/audit/components/audit-log-item'
import { auditLogFiltersSchema } from '@/modules/audit/schema'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Auditoria | BovControl' }

type PageProps = { searchParams: Promise<Record<string, string>> }

// ─── Page ──────────────────────────────────────────────────

export default async function AuditPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) redirect('/onboarding')

  const { farmId, role } = activeFarm

  // Acesso restrito a OWNER e MANAGER
  if (!['OWNER', 'MANAGER'].includes(role)) redirect('/')

  const params   = await searchParams
  const filters  = auditLogFiltersSchema.parse({
    entity: params['entity'],
    action: params['action'],
    userId: params['userId'],
    period: params['period'],
    page:   params['page'] ?? '1',
  })

  const [{ items, total, page, pageCount }, auditUsers] = await Promise.all([
    getAuditLogs(farmId, filters, filters.page),
    getAuditLogUsers(farmId),
  ])

  const isOwner = role === 'OWNER'

  // ── URL builders ─────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | undefined>) {
    const sp = new URLSearchParams()
    const combined = { entity: filters.entity, action: filters.action, userId: filters.userId, period: filters.period, ...overrides }
    for (const [k, v] of Object.entries(combined)) {
      if (v) sp.set(k, v)
    }
    return `/audit?${sp.toString()}`
  }

  const prevUrl = page > 1             ? buildUrl({ page: String(page - 1) }) : null
  const nextUrl = page < pageCount     ? buildUrl({ page: String(page + 1) }) : null
  const from    = Math.min((page - 1) * 50 + 1, total)
  const to      = Math.min(page * 50, total)

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        title="Auditoria"
        description={`${total.toLocaleString('pt-BR')} registro${total !== 1 ? 's' : ''}`}
        actions={
          isOwner ? (
            <div className="flex items-center gap-2">
              <a
                href={`/api/audit/export?format=csv${filters.entity ? `&entity=${filters.entity}` : ''}${filters.action ? `&action=${filters.action}` : ''}${filters.period ? `&period=${filters.period}` : ''}${filters.userId ? `&userId=${filters.userId}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                CSV
              </a>
              <a
                href={`/api/audit/export?format=json${filters.entity ? `&entity=${filters.entity}` : ''}${filters.action ? `&action=${filters.action}` : ''}${filters.period ? `&period=${filters.period}` : ''}${filters.userId ? `&userId=${filters.userId}` : ''}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                JSON
              </a>
            </div>
          ) : undefined
        }
      />

      {/* Filtros */}
      <Suspense>
        <AuditLogFilters
          users={auditUsers}
          currentFilters={{
            entity:  filters.entity,
            action:  filters.action,
            userId:  filters.userId,
            period:  filters.period,
          }}
        />
      </Suspense>

      {/* Lista */}
      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList />}
          title="Nenhum registro encontrado"
          description="Tente ajustar os filtros ou aguarde novas ações na fazenda."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <div className="divide-y divide-border/40 px-4">
            {items.map((log) => (
              <AuditLogItemRow key={log.id} log={log} showUser />
            ))}
          </div>
        </div>
      )}

      {/* Paginação */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-xs text-muted-foreground">
            {from}–{to} de {total.toLocaleString('pt-BR')}
          </span>
          <div className="flex gap-2">
            <Link
              href={prevUrl ?? '#'}
              aria-disabled={!prevUrl}
              className={cn(
                'rounded-lg border border-border px-3 py-1.5 text-xs font-medium',
                prevUrl
                  ? 'hover:bg-muted transition-colors'
                  : 'pointer-events-none opacity-40',
              )}
            >
              Anterior
            </Link>
            <span className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium bg-muted">
              {page} / {pageCount}
            </span>
            <Link
              href={nextUrl ?? '#'}
              aria-disabled={!nextUrl}
              className={cn(
                'rounded-lg border border-border px-3 py-1.5 text-xs font-medium',
                nextUrl
                  ? 'hover:bg-muted transition-colors'
                  : 'pointer-events-none opacity-40',
              )}
            >
              Próxima
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
