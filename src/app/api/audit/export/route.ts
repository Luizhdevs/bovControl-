import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/lib/auth'
import { getActiveFarm }             from '@/lib/active-farm'
import { requireFarmAccess }         from '@/lib/permissions'
import { prisma }                    from '@/lib/prisma'
import { auditLog }                  from '@/lib/audit'

const MAX_EXPORT_ROWS = 10_000

function resolvePeriod(period?: string | null): Date | undefined {
  if (!period) return undefined
  const from = new Date()
  if (period === 'today') {
    from.setHours(0, 0, 0, 0)
  } else {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    from.setDate(from.getDate() - days)
  }
  return from
}

export async function GET(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────
  const session = await auth()
  if (!session) {
    return new NextResponse('Não autorizado', { status: 401 })
  }

  const activeFarm = await getActiveFarm(session.user.id)
  if (!activeFarm) {
    return new NextResponse('Fazenda não encontrada', { status: 404 })
  }

  // ── Apenas OWNER pode exportar ──────────────────────────
  try {
    await requireFarmAccess(session.user.id, activeFarm.farmId, 'OWNER')
  } catch {
    return new NextResponse('Acesso negado. Apenas proprietários podem exportar logs.', { status: 403 })
  }

  // ── Parâmetros ──────────────────────────────────────────
  const { searchParams } = req.nextUrl
  const format  = searchParams.get('format') === 'json' ? 'json' : 'csv'
  const entity  = searchParams.get('entity')  || undefined
  const action  = searchParams.get('action')  || undefined
  const period  = searchParams.get('period')  || undefined
  const userId  = searchParams.get('userId')  || undefined
  const fromDate = resolvePeriod(period)

  // ── Query ───────────────────────────────────────────────
  const where = {
    farmId: activeFarm.farmId,
    ...(entity   && { entity }),
    ...(action   && { action }),
    ...(userId   && { userId }),
    ...(fromDate && { createdAt: { gte: fromDate } }),
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take:    MAX_EXPORT_ROWS,
  })

  // ── Registra a exportação no próprio AuditLog ───────────
  auditLog({
    farmId:   activeFarm.farmId,
    userId:   session.user.id,
    action:   'EXPORT',
    entity:   'AuditLog',
    entityId: activeFarm.farmId,
    metadata: {
      source:     'web',
      format,
      rows:       logs.length,
      exportedBy: session.user.id,
      filters:    { entity, action, period, userId },
    },
  })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename  = `audit-${activeFarm.farmId.slice(-6)}-${timestamp}.${format}`

  // ── Geração do arquivo ──────────────────────────────────
  if (format === 'json') {
    const body = JSON.stringify(logs, null, 2)
    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  // CSV
  const csvHeaders = ['id', 'createdAt', 'userId', 'action', 'entity', 'entityId', 'before', 'after', 'metadata']
  const csvRows = logs.map((log) =>
    [
      log.id,
      log.createdAt.toISOString(),
      log.userId,
      log.action,
      log.entity,
      log.entityId,
      JSON.stringify(log.before  ?? null),
      JSON.stringify(log.after   ?? null),
      JSON.stringify(log.metadata ?? null),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )

  const csv = [csvHeaders.join(','), ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
