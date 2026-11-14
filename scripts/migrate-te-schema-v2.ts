/**
 * Migração TE v2: adiciona colunas de rastreamento completo do protocolo TETF
 * Roda diretamente via Prisma $executeRaw — sem prisma migrate (ambiente Neon).
 *
 * Novas colunas:
 *   te_protocols:    start_date, withdrawal_date
 *   te_participations: withdrawal_done, te_response, sexagem_result
 */

import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('=== Migração TE v2 ===\n')

  // 1. Adicionar colunas em te_protocols
  await prisma.$executeRaw`
    ALTER TABLE te_protocols
      ADD COLUMN IF NOT EXISTS start_date      DATE,
      ADD COLUMN IF NOT EXISTS withdrawal_date DATE;
  `
  console.log('✓ te_protocols: start_date, withdrawal_date adicionadas')

  // 2. Adicionar colunas em te_participations
  await prisma.$executeRaw`
    ALTER TABLE te_participations
      ADD COLUMN IF NOT EXISTS withdrawal_done  BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS te_response      VARCHAR(20),
      ADD COLUMN IF NOT EXISTS sexagem_result   VARCHAR(20);
  `
  console.log('✓ te_participations: withdrawal_done, te_response, sexagem_result adicionadas')

  // 3. Migração de dados existentes:
  //    Protocolos anteriores já passaram pelo ciclo completo.
  //    Todos ACTIVE/COMPLETED: withdrawal=true, te_response='RESPONDED'
  //    DISCONTINUED: withdrawal=true, te_response='RESPONDED' (foram ao TE, falharam no DG)
  const updated = await prisma.$executeRaw`
    UPDATE te_participations
    SET
      withdrawal_done = true,
      te_response     = 'RESPONDED'
    WHERE te_response IS NULL;
  `
  console.log(`✓ ${updated} participações existentes migradas para withdrawal_done=true, te_response=RESPONDED`)

  // 4. Verificar resultado
  const protocols = await prisma.$queryRaw<{ id: string; name: string; start_date: Date | null; withdrawal_date: Date | null }[]>`
    SELECT id, name, start_date, withdrawal_date FROM te_protocols ORDER BY created_at DESC LIMIT 5;
  `
  console.log('\nProtocolos (últimos 5):')
  protocols.forEach(p => console.log(`  ${p.name} | start=${p.start_date ?? 'null'} | withdrawal=${p.withdrawal_date ?? 'null'}`))

  const parts = await prisma.$queryRaw<{ status: string; wd: boolean; tr: string | null; sr: string | null; count: bigint }[]>`
    SELECT status, withdrawal_done as wd, te_response as tr, sexagem_result as sr, COUNT(*) as count
    FROM te_participations
    GROUP BY status, withdrawal_done, te_response, sexagem_result
    ORDER BY status;
  `
  console.log('\nParticipações (agrupadas):')
  parts.forEach(p => console.log(`  ${p.status} | wd=${p.wd} | tr=${p.tr} | sr=${p.sr} | count=${p.count}`))

  await prisma.$disconnect()
  console.log('\n✅ Migração concluída!')
}

main().catch(e => { console.error(e); process.exit(1) })
