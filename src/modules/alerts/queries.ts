import { prisma }    from '@/lib/prisma'
import { subDays }  from 'date-fns'
import { getPregnantAnimals } from '@/modules/reproduction/queries'
import type { AlertWithAnimal, AlertFilters } from './types'

// ─── Lista de alertas ─────────────────────────────────────

export async function getAlerts(
  farmId:  string,
  filters: AlertFilters = {},
): Promise<AlertWithAnimal[]> {
  const rows = await prisma.alert.findMany({
    where: {
      farmId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type   ? { type:   filters.type   } : {}),
    },
    include: {
      animal: { select: { id: true, tag: true, name: true } },
    },
    orderBy: [
      { priority: 'asc' }, // enum order: HIGH → MEDIUM → LOW (PostgreSQL enum declaration order)
      { dueDate:  'asc' }, // mais urgente primeiro (nulls last por padrão)
      { createdAt: 'desc' },
    ],
    take: 200,
  })

  return rows as AlertWithAnimal[]
}

// ─── Contagem de alertas pendentes (badge nav) ─────────────

export async function getPendingAlertCount(farmId: string): Promise<number> {
  return prisma.alert.count({
    where: { farmId, status: 'PENDING' },
  })
}

// ─── Alertas de vacina pré-parto (Rotavec J5 + Tifopasteurina) ──
//
// Gera alertas VACCINATION em dois momentos:
//   - 60 dias antes do parto previsto (janela de aplicação inicial)
//   - 30 dias antes do parto previsto (reforço / segunda opção)
//
// Idempotente: não duplica alertas existentes (mesmo animal + mesmo título).
// Alertas de animais que já pariram são resolvidos automaticamente.

export async function syncPreCalvingVaccineAlerts(farmId: string): Promise<void> {
  const pregnant = await getPregnantAnimals(farmId)
  const today    = new Date()

  // IDs de animais ainda prenhes — usados para resolver alertas de quem pariu
  const pregnantIds = new Set(pregnant.map((p) => p.animalId))

  // Resolve alertas de vacina de animais que já pariram
  await prisma.alert.updateMany({
    where: {
      farmId,
      type:     'VACCINATION',
      status:   'PENDING',
      title:    { contains: 'pré-parto' },
      animalId: { notIn: Array.from(pregnantIds) },
    },
    data: { status: 'RESOLVED', resolvedAt: today },
  })

  for (const animal of pregnant) {
    const windows = [
      {
        dueDate:  subDays(animal.expectedCalvingDate, 60),
        title:    'Vacinas pré-parto — 60 dias',
        priority: 'MEDIUM' as const,
      },
      {
        dueDate:  subDays(animal.expectedCalvingDate, 30),
        title:    'Vacinas pré-parto — 30 dias',
        priority: 'HIGH' as const,
      },
    ]

    for (const w of windows) {
      // Ignora janelas que passaram há mais de 10 dias (já sem utilidade)
      const daysUntil = Math.ceil((w.dueDate.getTime() - today.getTime()) / 86_400_000)
      if (daysUntil < -10) continue

      const existing = await prisma.alert.findFirst({
        where: {
          farmId,
          animalId: animal.animalId,
          type:     'VACCINATION',
          title:    w.title,
          status:   { not: 'DISMISSED' },
        },
      })

      if (existing) continue

      await prisma.alert.create({
        data: {
          farmId,
          animalId:    animal.animalId,
          type:        'VACCINATION',
          title:       w.title,
          description: 'Aplicar Rotavec J5 e Tifopasteurina (ou Providean Enteroplus). Reduz mamite ambiental e diarreia neonatal nos bezerros.',
          priority:    w.priority,
          dueDate:     w.dueDate,
        },
      })
    }
  }
}
