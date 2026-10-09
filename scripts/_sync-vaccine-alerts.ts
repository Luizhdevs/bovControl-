import { PrismaClient } from '@prisma/client'
import { subDays } from 'date-fns'

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL_PROD } } })
const farmId = 'farm_saldanha'

type RawRow = { animalId: string; status: string; confirmedAt: Date; nextCheckDate: Date | null; tag: string; name: string | null; lastCalvingDate: Date | null }

async function main() {
  const today = new Date()

  // Replica getPregnantAnimals
  const rows = await db.$queryRaw<RawRow[]>`
    SELECT latest.*
    FROM (
      SELECT DISTINCT ON (r."animalId")
        r."animalId" AS "animalId", r.status, r.date AS "confirmedAt",
        r."nextCheckDate", a.tag, a.name, a."lastCalvingDate"
      FROM reproductions r
      JOIN animals a ON a.id = r."animalId"
      WHERE r.type = 'PREGNANCY_CHECK'
        AND a."farmId" = ${farmId}
        AND a.status   = 'ACTIVE'
      ORDER BY r."animalId", r.date DESC
    ) latest
    WHERE latest.status = 'CONFIRMED'
      AND NOT (
        latest."lastCalvingDate" IS NOT NULL
        AND latest."lastCalvingDate" BETWEEN
          (latest."confirmedAt" - INTERVAL '90 days')
          AND (latest."confirmedAt" + INTERVAL '90 days')
      )
      AND NOT EXISTS (
        SELECT 1 FROM reproductions calv
        WHERE calv."animalId" = latest."animalId"
          AND calv.type = 'CALVING'
          AND calv.date >= (
            SELECT COALESCE(MAX(ins.date), latest."confirmedAt" - INTERVAL '365 days')
            FROM reproductions ins
            WHERE ins."animalId" = latest."animalId"
              AND ins.type IN ('INSEMINATION', 'NATURAL_MATING')
          )
      )
  `

  const pregnant = rows.map(r => ({
    animalId: r.animalId,
    tag: r.tag,
    name: r.name,
    expectedCalvingDate: r.nextCheckDate ?? new Date(r.confirmedAt.getTime() + 280 * 86400000),
  }))

  const pregnantIds = new Set(pregnant.map(p => p.animalId))

  // Resolve alertas de animais que já pariram
  const resolved = await db.alert.updateMany({
    where: {
      farmId,
      type: 'VACCINATION',
      status: 'PENDING',
      title: { contains: 'pré-parto' },
      animalId: { notIn: Array.from(pregnantIds) },
    },
    data: { status: 'RESOLVED', resolvedAt: today },
  })
  if (resolved.count > 0) console.log(`Resolvidos ${resolved.count} alertas de animais que já pariram.`)

  let created = 0
  let skipped = 0

  for (const animal of pregnant) {
    const windows = [
      { dueDate: subDays(animal.expectedCalvingDate, 60), title: 'Vacinas pré-parto — 60 dias', priority: 'MEDIUM' as const },
      { dueDate: subDays(animal.expectedCalvingDate, 30), title: 'Vacinas pré-parto — 30 dias', priority: 'HIGH'   as const },
    ]

    for (const w of windows) {
      const daysUntil = Math.ceil((w.dueDate.getTime() - today.getTime()) / 86400000)
      if (daysUntil < -10) { skipped++; continue }

      const existing = await db.alert.findFirst({
        where: { farmId, animalId: animal.animalId, type: 'VACCINATION', title: w.title, status: { not: 'DISMISSED' } },
      })

      if (existing) { skipped++; continue }

      await db.alert.create({
        data: {
          farmId,
          animalId: animal.animalId,
          type: 'VACCINATION',
          title: w.title,
          description: 'Aplicar Rotavec J5 e Tifopasteurina (ou Providean Enteroplus). Reduz mamite ambiental e diarreia neonatal nos bezerros.',
          priority: w.priority,
          dueDate: w.dueDate,
        },
      })
      console.log(`  CRIADO: ${animal.tag} ${animal.name ?? ''} | ${w.title} | dueDate: ${w.dueDate.toISOString().slice(0,10)} | ${daysUntil}d`)
      created++
    }
  }

  console.log(`\nPronto: ${created} alertas criados, ${skipped} ignorados (já existiam ou muito antigos).`)
}
main().catch(e => console.error(e.message)).finally(() => db.$disconnect())
