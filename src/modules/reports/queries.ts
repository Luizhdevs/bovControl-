import { prisma } from '@/lib/prisma'

// ─── Tipos de retorno ──────────────────────────────────────

export type ReportParto = {
  id:       string
  date:     Date
  motherTag:  string
  motherName: string | null
  lotName:    string | null
  calveTag:   string | null
  calveName:  string | null
  calveSex:   string | null
}

export type ReportSecagem = {
  id:         string
  occurredAt: Date
  animalTag:  string
  animalName: string | null
  lotName:    string | null
  notes:      string | null
}

export type ReportAborto = ReportSecagem

export type ReportSaude = {
  id:          string
  occurredAt:  Date
  type:        string
  description: string
  medication:  string | null
  cost:        number | null
  resolved:    boolean
  notes:       string | null
  animalTag:   string
  animalName:  string | null
  lotName:     string | null
}

export type ReportReproducao = {
  id:           string
  date:         Date
  type:         string
  status:       string
  bullName:     string | null
  result:       string | null
  notes:        string | null
  animalTag:    string
  animalName:   string | null
  lotName:      string | null
}

export type ReportAlerta = {
  id:          string
  type:        string
  title:       string
  description: string | null
  priority:    string
  status:      string
  createdAt:   Date
  resolvedAt:  Date | null
  animalTag:   string | null
  animalName:  string | null
}

export type FarmActivityReport = {
  farmName:   string
  from:       Date
  to:         Date
  partos:     ReportParto[]
  secagens:   ReportSecagem[]
  abortos:    ReportAborto[]
  saude:      ReportSaude[]
  reproducao: ReportReproducao[]
  alertas:    ReportAlerta[]
}

// ─── Query principal ───────────────────────────────────────

export async function getFarmActivityReport(
  farmId: string,
  from:   Date,
  to:     Date,
): Promise<FarmActivityReport> {
  const toEndOfDay = new Date(to)
  toEndOfDay.setHours(23, 59, 59, 999)

  const [
    farm,
    calvinRows,
    calvesRows,
    secagemRows,
    abortoRows,
    saudeRows,
    reproRows,
    alertaRows,
  ] = await Promise.all([

    // Nome da fazenda
    prisma.farm.findUnique({
      where:  { id: farmId },
      select: { name: true },
    }),

    // Partos registrados como Reproduction type=CALVING
    prisma.reproduction.findMany({
      where: {
        animal: { farmId },
        type:   'CALVING',
        date:   { gte: from, lte: toEndOfDay },
      },
      select: {
        id:   true,
        date: true,
        animal: {
          select: {
            id:   true,
            tag:  true,
            name: true,
            lot:  { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    }),

    // Bezerros nascidos no período (para cruzar com partos)
    prisma.animal.findMany({
      where: {
        farmId,
        birthDate: { gte: from, lte: toEndOfDay },
        motherId:  { not: null },
      },
      select: { id: true, tag: true, name: true, sex: true, birthDate: true, motherId: true },
    }),

    // Secagens
    prisma.healthEvent.findMany({
      where: {
        animal:      { farmId },
        type:        'OTHER',
        description: 'Secagem',
        occurredAt:  { gte: from, lte: toEndOfDay },
      },
      select: {
        id:         true,
        occurredAt: true,
        notes:      true,
        animal: {
          select: { tag: true, name: true, lot: { select: { name: true } } },
        },
      },
      orderBy: { occurredAt: 'asc' },
    }),

    // Abortos
    prisma.healthEvent.findMany({
      where: {
        animal:      { farmId },
        type:        'OTHER',
        description: 'Aborto',
        occurredAt:  { gte: from, lte: toEndOfDay },
      },
      select: {
        id:         true,
        occurredAt: true,
        notes:      true,
        animal: {
          select: { tag: true, name: true, lot: { select: { name: true } } },
        },
      },
      orderBy: { occurredAt: 'asc' },
    }),

    // Demais eventos de saúde (excluindo Secagem e Aborto sintéticos)
    prisma.healthEvent.findMany({
      where: {
        animal:     { farmId },
        occurredAt: { gte: from, lte: toEndOfDay },
        NOT: {
          AND: [
            { type:        'OTHER' },
            { description: { in: ['Secagem', 'Aborto'] } },
          ],
        },
      },
      select: {
        id:          true,
        type:        true,
        description: true,
        medication:  true,
        cost:        true,
        occurredAt:  true,
        resolved:    true,
        notes:       true,
        animal: {
          select: { tag: true, name: true, lot: { select: { name: true } } },
        },
      },
      orderBy: { occurredAt: 'asc' },
    }),

    // Reprodução (exceto CALVING — já em partos)
    prisma.reproduction.findMany({
      where: {
        animal: { farmId },
        type:   { in: ['INSEMINATION', 'NATURAL_MATING', 'PREGNANCY_CHECK'] },
        date:   { gte: from, lte: toEndOfDay },
      },
      select: {
        id:       true,
        type:     true,
        status:   true,
        date:     true,
        bullName: true,
        result:   true,
        notes:    true,
        animal: {
          select: { tag: true, name: true, lot: { select: { name: true } } },
        },
      },
      orderBy: { date: 'asc' },
    }),

    // Alertas críticos criados ou resolvidos no período
    prisma.alert.findMany({
      where: {
        farmId,
        type: {
          in: [
            'CALVING_OVERDUE', 'CALVING_SOON', 'DRY_OFF_DUE',
            'HIGH_CCS', 'MASTITIS_FOLLOW_UP', 'DISCARD_REVIEW', 'EMPTY_COW_LATE',
            'PREGNANCY_CHECK_DUE',
          ],
        },
        OR: [
          { createdAt:  { gte: from, lte: toEndOfDay } },
          { resolvedAt: { gte: from, lte: toEndOfDay } },
        ],
      },
      select: {
        id:          true,
        type:        true,
        title:       true,
        description: true,
        priority:    true,
        status:      true,
        createdAt:   true,
        resolvedAt:  true,
        animal:      { select: { tag: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Monta mapa motherId → bezerro para cruzar com partos
  const calveByMotherId = new Map<string, typeof calvesRows[0]>()
  for (const c of calvesRows) {
    if (c.motherId) calveByMotherId.set(c.motherId, c)
  }

  const partos: ReportParto[] = calvinRows.map((r) => {
    const calf = calveByMotherId.get(r.animal.id)
    return {
      id:         r.id,
      date:       r.date,
      motherTag:  r.animal.tag,
      motherName: r.animal.name,
      lotName:    r.animal.lot?.name ?? null,
      calveTag:   calf?.tag ?? null,
      calveName:  calf?.name ?? null,
      calveSex:   calf?.sex ?? null,
    }
  })

  const secagens: ReportSecagem[] = secagemRows.map((e) => ({
    id:         e.id,
    occurredAt: e.occurredAt,
    animalTag:  e.animal.tag,
    animalName: e.animal.name,
    lotName:    e.animal.lot?.name ?? null,
    notes:      e.notes,
  }))

  const abortos: ReportAborto[] = abortoRows.map((e) => ({
    id:         e.id,
    occurredAt: e.occurredAt,
    animalTag:  e.animal.tag,
    animalName: e.animal.name,
    lotName:    e.animal.lot?.name ?? null,
    notes:      e.notes,
  }))

  const saude: ReportSaude[] = saudeRows.map((e) => ({
    id:          e.id,
    occurredAt:  e.occurredAt,
    type:        e.type,
    description: e.description,
    medication:  e.medication,
    cost:        e.cost,
    resolved:    e.resolved,
    notes:       e.notes,
    animalTag:   e.animal.tag,
    animalName:  e.animal.name,
    lotName:     e.animal.lot?.name ?? null,
  }))

  const reproducao: ReportReproducao[] = reproRows.map((r) => ({
    id:         r.id,
    date:       r.date,
    type:       r.type,
    status:     r.status,
    bullName:   r.bullName,
    result:     r.result,
    notes:      r.notes,
    animalTag:  r.animal.tag,
    animalName: r.animal.name,
    lotName:    r.animal.lot?.name ?? null,
  }))

  const alertas: ReportAlerta[] = alertaRows.map((a) => ({
    id:          a.id,
    type:        a.type,
    title:       a.title,
    description: a.description,
    priority:    a.priority,
    status:      a.status,
    createdAt:   a.createdAt,
    resolvedAt:  a.resolvedAt,
    animalTag:   a.animal?.tag ?? null,
    animalName:  a.animal?.name ?? null,
  }))

  return {
    farmName: farm?.name ?? 'Fazenda',
    from,
    to: toEndOfDay,
    partos,
    secagens,
    abortos,
    saude,
    reproducao,
    alertas,
  }
}
