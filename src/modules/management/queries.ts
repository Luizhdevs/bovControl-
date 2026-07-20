/**
 * Sprint 9.3B — Manejo de Hoje
 * Query principal: getTodayManagementOverview
 *
 * SOMENTE LEITURA — nenhum dado é alterado.
 * 4 queries ao banco (1 seq + 3 paralelas), sem N+1.
 * Sempre filtra por farmId.
 */

import { prisma } from '@/lib/prisma'
import type {
  ManagementActionItem,
  ManagementActionType,
  ManagementOverview,
  ManagementPriority,
  ManagementSections,
  ManagementSummary,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

function daysDiff(date: Date | string | null, today: Date): number | null {
  if (!date) return null
  return Math.round((new Date(date).getTime() - today.getTime()) / DAY_MS)
}

function originOf(
  externalCode: string | null,
  hasVetSnapshot: boolean,
): ManagementActionItem['origin'] {
  if (externalCode) return 'VETERINARY_IMPORTED'
  if (hasVetSnapshot) return 'MIXED'
  return 'MANUAL'
}

function item(
  id:           string,
  animal:       { id: string; tag: string; name: string | null; externalCode: string | null; category: string; lotName: string | null; photoUrl: string | null; milkStatus: string | null },
  origin:       ManagementActionItem['origin'],
  type:         ManagementActionType,
  priority:     ManagementPriority,
  title:        string,
  reason:       string,
  days:         number | null = null,
  dueDate:      Date | null   = null,
): ManagementActionItem {
  return {
    id,
    animalId:    animal.id,
    animalTag:   animal.tag,
    animalName:  animal.name,
    externalCode: animal.externalCode,
    origin,
    category:    animal.category,
    lotName:     animal.lotName,
    photoUrl:    animal.photoUrl,
    milkStatus:  animal.milkStatus,
    title,
    reason,
    priority,
    type,
    days,
    dueDate,
    href: `/animals/${animal.id}`,
  }
}

// ─── Query principal ──────────────────────────────────────

export async function getTodayManagementOverview(farmId: string): Promise<ManagementOverview> {
  const today = new Date()

  // 1. Relatório veterinário mais recente (1 query sequencial)
  const latestReport = await prisma.veterinaryReport.findFirst({
    where:   { farmId, importStatus: { in: ['IMPORTED', 'PARTIALLY_IMPORTED'] } },
    orderBy: { reportDate: 'desc' },
    select:  { id: true },
  })

  // 2. Carregamento em lote — sem N+1 (3 queries em paralelo)
  const [animals, vetSnapshots, pendingAlerts] = await Promise.all([
    // Todos os animais ACTIVE com foto principal, lote e contagens
    prisma.animal.findMany({
      where:   { farmId, status: 'ACTIVE' },
      select: {
        id:              true,
        tag:             true,
        name:            true,
        sex:             true,
        category:        true,
        externalCode:    true,
        lotId:           true,
        motherId:        true,
        birthDate:       true,
        lastCalvingDate: true,
        milkStatus:      true,
        lot:             { select: { name: true } },
        photos:          { where: { isPrimary: true }, select: { url: true }, take: 1 },
        _count:          { select: { photos: true, reproductions: true } },
      },
      orderBy: [{ category: 'asc' }, { tag: 'asc' }],
    }),

    // Snapshots vet do relatório mais recente (por animalId)
    latestReport
      ? prisma.veterinaryAnimalSnapshot.findMany({
          where: {
            farmId,
            reportId: latestReport.id,
            animalId: { not: null },
          },
          select: {
            animalId:             true,
            reportGroup:          true,
            expectedCalvingDate:  true,
            mastitisDays:         true,
            ccsThousand:          true,
            discardRecommendation: true,
          },
        })
      : Promise.resolve([]),

    // Alertas pendentes com relação de animal
    prisma.alert.findMany({
      where:   { farmId, status: 'PENDING' },
      select: {
        id:          true,
        title:       true,
        description: true,
        priority:    true,
        dueDate:     true,
        animal:      { select: { id: true, tag: true, name: true } },
      },
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 50,
    }),
  ])

  // 3. Mapa animalId → snapshot para lookup O(1)
  const snapMap = new Map(vetSnapshots.map((s) => [s.animalId!, s]))

  // 4. Detecção complementar de partos (casos onde lastCalvingDate não foi atualizado):
  //    - reproduções do tipo CALVING registradas nos últimos 180 dias
  //    - filhos (maternalChildren) nascidos nos últimos 180 dias
  //    Evita N+1: 2 groupBy queries em paralelo filtradas pelo conjunto de animalIds
  const animalIds    = animals.map(a => a.id)
  const since180dMs  = today.getTime() - 180 * DAY_MS
  const since180d    = new Date(since180dMs)

  const [recentCalvingReprods, recentCalfBirths] = await Promise.all([
    animalIds.length > 0
      ? prisma.reproduction.groupBy({
          by:    ['animalId'],
          where: {
            animalId: { in: animalIds },
            type:     'CALVING',
            date:     { gte: since180d },
          },
          _max: { date: true },
        })
      : Promise.resolve([]),

    animalIds.length > 0
      ? prisma.animal.groupBy({
          by:    ['motherId'],
          where: {
            motherId:  { in: animalIds },
            birthDate: { gte: since180d },
          },
          _max: { birthDate: true },
        })
      : Promise.resolve([]),
  ])

  // Mapas de lookup O(1): animalId → timestamp do parto mais recente detectado
  const reproCalvMap = new Map(
    recentCalvingReprods
      .filter(r => r._max.date != null)
      .map(r  => [r.animalId, r._max.date!.getTime()]),
  )
  const calfBirthMap = new Map(
    recentCalfBirths
      .filter(r => r.motherId != null && r._max.birthDate != null)
      .map(r  => [r.motherId!, r._max.birthDate!.getTime()]),
  )

  // 5. Seções
  const critical:     ManagementActionItem[] = []
  const calving:      ManagementActionItem[] = []
  const dryOff:       ManagementActionItem[] = []
  const reproduction: ManagementActionItem[] = []
  const calves:       ManagementActionItem[] = []
  const registration: ManagementActionItem[] = []
  const health:       ManagementActionItem[] = []

  for (const a of animals) {
    const snap     = snapMap.get(a.id) ?? null
    const hasSnap  = !!snap
    const origin   = originOf(a.externalCode, hasSnap)
    const photoUrl = a.photos[0]?.url ?? null
    const lotName  = a.lot?.name ?? null
    const base     = { id: a.id, tag: a.tag, name: a.name, externalCode: a.externalCode, category: a.category, lotName, photoUrl, milkStatus: a.milkStatus }

    if (snap) {
      const { reportGroup, expectedCalvingDate, mastitisDays, ccsThousand, discardRecommendation } = snap
      const daysUntilCalving = daysDiff(expectedCalvingDate, today)

      // ── Parto ──────────────────────────────────────────────
      // Detecta se o animal já pariu desde a data prevista (tolerância 14 dias antes).
      // Usa 3 fontes para cobrir tanto partos via registerCalving quanto via createAnimal+motherId:
      //   1. animal.lastCalvingDate (atualizado por registerCalving)
      //   2. Reprodução CALVING registrada diretamente
      //   3. Filho (maternalChildren) com birthDate recente
      const expectedMs = expectedCalvingDate ? new Date(expectedCalvingDate).getTime() : null
      const lastCalvMs = [
        a.lastCalvingDate    ? new Date(a.lastCalvingDate).getTime() : null,
        reproCalvMap.get(a.id) ?? null,
        calfBirthMap.get(a.id) ?? null,
      ].reduce<number | null>(
        (best, ms) => ms === null ? best : best === null ? ms : Math.max(best, ms),
        null,
      )
      const TOLERANCE_MS = 14 * DAY_MS

      const alreadyCalvedSinceExpected = lastCalvMs !== null && expectedMs !== null &&
        lastCalvMs >= expectedMs - TOLERANCE_MS

      // Parto vencido — só exibe se o animal não tiver parto registrado desde a data prevista
      if (daysUntilCalving !== null && daysUntilCalving < 0 && !alreadyCalvedSinceExpected) {
        const abs = Math.abs(daysUntilCalving)
        const it = item(`${a.id}-calving-overdue`, base, origin,
          'CALVING_OVERDUE', 'HIGH',
          'Parto vencido',
          `Previsto há ${abs} dia${abs !== 1 ? 's' : ''}`,
          daysUntilCalving,
          expectedCalvingDate ? new Date(expectedCalvingDate) : null,
        )
        calving.push(it)
        critical.push(it)
      } else if (
        !alreadyCalvedSinceExpected &&
        (reportGroup === 'CLOSE_UP' || (daysUntilCalving !== null && daysUntilCalving <= 30))
      ) {
        // Parto próximo — pula se a vaca já pariu recentemente (60 dias) ou desde a data prevista
        const calvedRecently60d = lastCalvMs !== null &&
          lastCalvMs >= today.getTime() - 60 * DAY_MS
        if (!calvedRecently60d) {
          const d        = daysUntilCalving
          const isUrgent = reportGroup === 'CLOSE_UP' || (d !== null && d <= 7)
          const title    = reportGroup === 'CLOSE_UP' && d === null
            ? 'Amojada — parto iminente'
            : d === 0 ? 'Parto previsto para hoje'
            : `Parto em ${d} dia${d !== 1 ? 's' : ''}`
          const reason   = expectedCalvingDate
            ? `Previsto para ${new Date(expectedCalvingDate).toLocaleDateString('pt-BR')}`
            : 'Vaca no grupo amojadas'
          const it = item(`${a.id}-calving-soon`, base, origin,
            'CALVING_SOON', isUrgent ? 'HIGH' : 'MEDIUM',
            title, reason, d,
            expectedCalvingDate ? new Date(expectedCalvingDate) : null,
          )
          calving.push(it)
          if (isUrgent) critical.push(it)
        }
      }

      // ── A secar ────────────────────────────────────────────
      // Suprime se a vaca já pariu recentemente OU já foi secada manualmente
      const calvedInLast90d = lastCalvMs !== null &&
        lastCalvMs >= today.getTime() - 90 * DAY_MS
      const alreadyDry = a.milkStatus === 'DRY' || a.milkStatus === 'DRY_PREGNANT'
      if (reportGroup === 'TO_DRY' && !calvedInLast90d && !alreadyDry) {
        const it = item(`${a.id}-dry`, base, origin,
          'DRY_OFF_DUE', 'HIGH',
          'Secar vaca',
          'Recomendado secar neste ciclo',
        )
        dryOff.push(it)
        critical.push(it)
      }

      // ── Reprodução ─────────────────────────────────────────
      // Suprime alertas reprodutivos se a vaca já pariu recentemente
      if (reportGroup === 'EMPTY_LATE' && !calvedInLast90d) {
        reproduction.push(item(`${a.id}-empty-late`, base, origin,
          'EMPTY_COW_LATE', 'MEDIUM',
          'Vaca vazia atrasada',
          'Vazia há mais de 45 dias sem inseminação',
        ))
      }
      if (reportGroup === 'INSEMINATED_OVER_30D' && !calvedInLast90d) {
        reproduction.push(item(`${a.id}-preg-check`, base, origin,
          'PREGNANCY_CHECK_DUE', 'MEDIUM',
          'Diagnóstico de gestação pendente',
          'Mais de 30 dias desde a última inseminação',
        ))
      }

      // ── Saúde ──────────────────────────────────────────────
      if (mastitisDays && mastitisDays > 0) {
        const it = item(`${a.id}-mastitis`, base, origin,
          'MASTITIS_FOLLOW_UP', 'HIGH',
          'Acompanhar mamite',
          `${mastitisDays} dia${mastitisDays !== 1 ? 's' : ''} com mamite registrados`,
          mastitisDays,
        )
        health.push(it)
        critical.push(it)
      }
      if (ccsThousand && ccsThousand >= 400) {
        health.push(item(`${a.id}-ccs`, base, origin,
          'HIGH_CCS', 'MEDIUM',
          'CCS elevado',
          `CCS: ${ccsThousand.toLocaleString('pt-BR')} ×1000`,
        ))
      }
      if (discardRecommendation) {
        health.push(item(`${a.id}-discard`, base, origin,
          'DISCARD_REVIEW', 'MEDIUM',
          'Revisar descarte',
          discardRecommendation,
        ))
      }
    }

    // ── Bezerros incompletos ────────────────────────────────
    if (a.category === 'CALF') {
      const missing: string[] = []
      if (!a.name)      missing.push('sem nome')
      if (!a.birthDate) missing.push('sem data de nascimento')
      if (!a.motherId)  missing.push('sem mãe vinculada')
      if (a._count.photos === 0) missing.push('sem foto')
      if (missing.length > 0) {
        calves.push(item(`${a.id}-incomplete`, base, origin,
          'INCOMPLETE_CALF', 'LOW',
          'Bezerro com cadastro incompleto',
          missing.join(' · '),
        ))
      }
    }

    // ── Cadastro (sem foto / sem lote) ─────────────────────
    if (a._count.photos === 0 && a.category !== 'CALF') {
      registration.push(item(`${a.id}-no-photo`, base, origin,
        'MISSING_PHOTO', 'LOW',
        'Sem foto',
        'Animal sem foto registrada',
      ))
    }
    if (!a.lotId) {
      registration.push(item(`${a.id}-no-lot`, base, origin,
        'MISSING_LOT', 'LOW',
        'Sem lote',
        'Animal sem lote atribuído',
      ))
    }
  }

  // 5. Ordena cada seção por data mais próxima (days crescente, nulls por último)
  const byDays = (a: ManagementActionItem, b: ManagementActionItem) =>
    (a.days ?? Infinity) - (b.days ?? Infinity)

  critical.sort(byDays)
  calving.sort(byDays)
  dryOff.sort(byDays)
  reproduction.sort(byDays)
  calves.sort(byDays)
  registration.sort(byDays)
  health.sort(byDays)

  // 6. Seção alertas
  const alerts: ManagementActionItem[] = pendingAlerts.map((al) => ({
    id:           al.id,
    animalId:     al.animal?.id ?? '',
    animalTag:    al.animal?.tag ?? '—',
    animalName:   al.animal?.name ?? null,
    externalCode: null,
    origin:       'UNKNOWN' as const,
    category:     null,
    lotName:      null,
    photoUrl:     null,
    milkStatus:   null,
    title:        al.title,
    reason:       al.description ?? al.title,
    priority:     al.priority as ManagementPriority,
    type:         'PENDING_ALERT' as const,
    days:         null,
    dueDate:      al.dueDate ?? null,
    href:         al.animal ? `/animals/${al.animal.id}` : '/alerts',
  }))

  // 7. Resumo
  const allUnique = new Set([
    ...critical.map((i) => i.id),
    ...calving.map((i) => i.id),
    ...dryOff.map((i) => i.id),
    ...reproduction.map((i) => i.id),
    ...calves.map((i) => i.id),
    ...registration.map((i) => i.id),
    ...health.map((i) => i.id),
    ...alerts.map((i) => i.id),
  ])

  const allItems = [...critical, ...calving, ...dryOff, ...reproduction, ...calves, ...registration, ...health, ...alerts]

  const summary: ManagementSummary = {
    totalActions:        allUnique.size,
    highPriority:        allItems.filter((i) => i.priority === 'HIGH').length,
    mediumPriority:      allItems.filter((i) => i.priority === 'MEDIUM').length,
    lowPriority:         allItems.filter((i) => i.priority === 'LOW').length,
    closeToCalving:      calving.length,
    overdueCalving:      calving.filter((i) => i.type === 'CALVING_OVERDUE').length,
    dueToDryOff:         dryOff.length,
    emptyLate:           reproduction.filter((i) => i.type === 'EMPTY_COW_LATE').length,
    pregnancyCheckDue:   reproduction.filter((i) => i.type === 'PREGNANCY_CHECK_DUE').length,
    incompleteCalves:    calves.length,
    animalsWithoutLot:   registration.filter((i) => i.type === 'MISSING_LOT').length,
    animalsWithoutPhoto: registration.filter((i) => i.type === 'MISSING_PHOTO').length,
    pendingAlerts:       alerts.length,
  }

  // 8. Seções
  const sections: ManagementSections = {
    critical, calving, dryOff, reproduction, calves, registration, health, alerts,
  }

  return { summary, sections }
}
