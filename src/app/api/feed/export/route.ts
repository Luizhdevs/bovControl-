/**
 * /api/feed/export — Exportação CSV de dados de alimentação.
 *
 * Query params:
 *   type=sessions (default) — sessões de alimentação
 *   type=animals            — consumo por animal
 *   days=30 (default)       — período em dias
 */

import { NextResponse } from 'next/server'
import { auth }         from '@/lib/auth'
import { prisma }       from '@/lib/prisma'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(csvEscape).join(',')
}

export async function GET(request: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const farmUser = await prisma.farmUser.findFirst({
    where:  { userId: session.user.id },
    select: { farmId: true },
  })
  if (!farmUser) return NextResponse.json({ error: 'Fazenda não encontrada' }, { status: 403 })

  const { farmId } = farmUser
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'sessions'
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)))

  const since = startOfDay(subDays(new Date(), days - 1))
  const until = endOfDay(new Date())

  const formatDateBR = (d: Date) => format(d, 'dd/MM/yyyy', { locale: ptBR })

  let csv: string
  let filename: string

  if (type === 'animals') {
    // Consumo por animal
    const rows = await prisma.animalFeedConsumption.findMany({
      where:  { feedSession: { farmId, date: { gte: since, lte: until } } },
      select: {
        consumedKg:    true,
        estimatedCost: true,
        createdAt:     true,
        animal:       { select: { tag: true, name: true, category: true } },
        feedSession:  {
          select: {
            date:          true,
            lot:      { select: { name: true } },
            feedType: { select: { name: true, brand: true } },
          },
        },
      },
      orderBy: [{ feedSession: { date: 'desc' } }, { animal: { tag: 'asc' } }],
    })

    const header = row('Data', 'Brinco', 'Nome', 'Categoria', 'Lote', 'Ração', 'Marca', 'Kg consumido', 'Custo estimado (R$)')
    const lines = rows.map((r) =>
      row(
        formatDateBR(r.feedSession.date),
        r.animal.tag,
        r.animal.name,
        r.animal.category,
        r.feedSession.lot.name,
        r.feedSession.feedType.name,
        r.feedSession.feedType.brand,
        r.consumedKg.toFixed(3),
        r.estimatedCost.toFixed(2),
      ),
    )

    csv      = [header, ...lines].join('\r\n')
    filename = `consumo-animais-${days}d.csv`
  } else {
    // Sessões de alimentação (default)
    const sessions = await prisma.feedSession.findMany({
      where:   { farmId, date: { gte: since, lte: until } },
      select: {
        date:                 true,
        bagCount:             true,
        totalWeightKg:        true,
        totalCost:            true,
        animalCount:          true,
        averageKgPerAnimal:   true,
        averageCostPerAnimal: true,
        notes:                true,
        lot:      { select: { name: true, type: true } },
        feedType: { select: { name: true, brand: true, weightPerBagKg: true, pricePerBag: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    })

    const header = row(
      'Data', 'Lote', 'Tipo do lote', 'Ração', 'Marca',
      'Sacos', 'Kg totais', 'Custo total (R$)',
      'Animais', 'Kg/animal', 'Custo/animal (R$)',
      'Observações',
    )
    const lines = sessions.map((s) =>
      row(
        formatDateBR(s.date),
        s.lot.name,
        s.lot.type,
        s.feedType.name,
        s.feedType.brand,
        s.bagCount,
        s.totalWeightKg.toFixed(1),
        s.totalCost.toFixed(2),
        s.animalCount,
        s.averageKgPerAnimal.toFixed(3),
        s.averageCostPerAnimal.toFixed(2),
        s.notes,
      ),
    )

    csv      = [header, ...lines].join('\r\n')
    filename = `alimentacao-${days}d.csv`
  }

  // BOM UTF-8 para Excel reconhecer caracteres especiais
  const bom  = '﻿'
  const body = bom + csv

  return new NextResponse(body, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
