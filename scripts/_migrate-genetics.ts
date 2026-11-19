/**
 * Cria as tabelas do módulo de genética diretamente via SQL.
 * Equivalente a: prisma migrate dev --name genetics_module
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== MIGRAÇÃO — módulo genetics ===\n')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS genetic_profiles (
      id            TEXT        NOT NULL PRIMARY KEY,
      "farmId"      TEXT        NOT NULL,
      "bullName"    TEXT        NOT NULL,
      "externalCode" TEXT,
      race          TEXT,
      "labName"     TEXT,

      "depLeite"        DOUBLE PRECISION,
      "depGordura"      DOUBLE PRECISION,
      "depProteina"     DOUBLE PRECISION,
      "depDesmame"      DOUBLE PRECISION,
      "depSobreano"     DOUBLE PRECISION,
      "depParto"        DOUBLE PRECISION,
      "depCcs"          DOUBLE PRECISION,
      "depTemperamento" DOUBLE PRECISION,
      "depConformacao"  DOUBLE PRECISION,
      "depFertilidade"  DOUBLE PRECISION,

      "accLeite"   DOUBLE PRECISION,
      "accDesmame" DOUBLE PRECISION,

      active    BOOLEAN  NOT NULL DEFAULT TRUE,
      notes     TEXT,

      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "genetic_profiles_farmId_fkey"
        FOREIGN KEY ("farmId") REFERENCES farms(id)
    )
  `)
  console.log('✅ genetic_profiles criada (ou já existia)')

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "genetic_profiles_farmId_active_idx"
      ON genetic_profiles ("farmId", active)
  `)
  console.log('✅ índice genetic_profiles_farmId_active_idx criado')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS farm_breeding_goals (
      id       TEXT NOT NULL PRIMARY KEY,
      "farmId" TEXT NOT NULL UNIQUE,

      "wLeite"       INTEGER NOT NULL DEFAULT 30,
      "wGanho"       INTEGER NOT NULL DEFAULT 25,
      "wParto"       INTEGER NOT NULL DEFAULT 20,
      "wCcs"         INTEGER NOT NULL DEFAULT 15,
      "wConformacao" INTEGER NOT NULL DEFAULT 10,

      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "farm_breeding_goals_farmId_fkey"
        FOREIGN KEY ("farmId") REFERENCES farms(id)
    )
  `)
  console.log('✅ farm_breeding_goals criada (ou já existia)')

  // Registrar na tabela de migrações do Prisma para manter consistência
  await prisma.$executeRawUnsafe(`
    INSERT INTO "_prisma_migrations" (
      id, checksum, finished_at, migration_name,
      logs, rolled_back_at, started_at, applied_steps_count
    )
    SELECT
      gen_random_uuid()::text,
      'manual_genetics_module',
      NOW(), 'genetics_module',
      NULL, NULL, NOW(), 1
    WHERE NOT EXISTS (
      SELECT 1 FROM "_prisma_migrations"
      WHERE migration_name = 'genetics_module'
    )
  `)
  console.log('✅ migração registrada em _prisma_migrations')

  console.log('\n✅ Migração concluída — módulo genetics ativo\n')
}

main().catch(e => { console.error('❌', e); process.exit(1) }).finally(() => prisma.$disconnect())
