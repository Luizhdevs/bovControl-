/**
 * Production setup script — clears all development / seed data while preserving
 * the schema, OWNER users, and farm structure.
 *
 * Usage:
 *   tsx scripts/production-setup.ts               # dry-run (shows what would be deleted)
 *   tsx scripts/production-setup.ts --execute      # runs deletions
 *
 * What is deleted:
 *   - All operational data: animals, lots, pastures, milk records, milking sessions,
 *     health events, reproductions, feed types, feed sessions, feed consumptions,
 *     animal photos, weight records, alerts, audit logs
 *
 * What is preserved:
 *   - Users, Accounts, Sessions (NextAuth)
 *   - Farms and FarmUsers (tenant structure + roles)
 *   - Invites (pending invites remain valid)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = !process.argv.includes('--execute')

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN — no changes will be made' : '🚨 EXECUTE — deleting dev data')
  console.log()

  const counts = await prisma.$transaction([
    prisma.animalFeedConsumption.count(),
    prisma.feedSession.count(),
    prisma.feedType.count(),
    prisma.reproduction.count(),
    prisma.milkRecord.count(),
    prisma.milkingSession.count(),
    prisma.healthEvent.count(),
    prisma.weightRecord.count(),
    prisma.animalPhoto.count(),
    prisma.animal.count(),
    prisma.lot.count(),
    prisma.pasture.count(),
    prisma.alert.count(),
    prisma.auditLog.count(),
  ])

  const labels = [
    'AnimalFeedConsumption',
    'FeedSession',
    'FeedType',
    'Reproduction',
    'MilkRecord',
    'MilkingSession',
    'HealthEvent',
    'WeightRecord',
    'AnimalPhoto',
    'Animal',
    'Lot',
    'Pasture',
    'Alert',
    'AuditLog',
  ]

  let total = 0
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i]!
    const n = (counts[i] as number) ?? 0
    total += n
    console.log(`  ${label.padEnd(24)} ${n.toString().padStart(6)} records`)
  }
  console.log()
  console.log(`  Total: ${total} records to delete`)
  console.log()

  if (DRY_RUN) {
    console.log('Run with --execute to apply deletions.')
    return
  }

  console.log('Deleting in dependency order…')
  await prisma.$transaction([
    prisma.animalFeedConsumption.deleteMany(),
    prisma.feedSession.deleteMany(),
    prisma.feedType.deleteMany(),
    prisma.reproduction.deleteMany(),
    prisma.milkRecord.deleteMany(),
    prisma.milkingSession.deleteMany(),
    prisma.healthEvent.deleteMany(),
    prisma.weightRecord.deleteMany(),
    prisma.animalPhoto.deleteMany(),
    prisma.animal.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.pasture.deleteMany(),
    prisma.alert.deleteMany(),
    prisma.auditLog.deleteMany(),
  ])

  console.log('✅ Done. Farm structure and user accounts preserved.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
