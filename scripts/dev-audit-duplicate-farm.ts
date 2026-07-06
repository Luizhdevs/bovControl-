/**
 * DEV ONLY — Auditoria + remoção da fazenda duplicada vazia.
 * Uso:
 *   npx tsx scripts/dev-audit-duplicate-farm.ts             # só audita
 *   npx tsx scripts/dev-audit-duplicate-farm.ts --delete    # remove se seguro
 *   npx tsx scripts/dev-audit-duplicate-farm.ts --link      # vincula admin@perdigao à farm real
 *   npx tsx scripts/dev-audit-duplicate-farm.ts --delete --link
 */
import { prisma } from '../src/lib/prisma'

const DUP_FARM_ID        = 'cmr52jhha000112avax4dndkc'
const REAL_FARM_ID       = 'farm_saldanha'
const PERDIGAO_USER_EMAIL = 'admin@perdigao.com.br'

const DO_DELETE = process.argv.includes('--delete')
const DO_LINK   = process.argv.includes('--link')

async function main() {
  console.log('\n══════════════════════════════════════════════════════════')
  console.log('  DEV — FAZENDA DUPLICADA: AUDITORIA E CORREÇÃO')
  console.log(`  Modo: ${DO_DELETE ? '⚡ DELETE' : '🔍 AUDIT'} | ${DO_LINK ? '⚡ LINK' : '(sem link)'}`)
  console.log('══════════════════════════════════════════════════════════\n')

  // ── ETAPA 1 — Auditar farm duplicada ─────────────────

  const dupFarm = await prisma.farm.findUnique({
    where:  { id: DUP_FARM_ID },
    select: { id: true, name: true, createdAt: true },
  })
  if (!dupFarm) {
    console.log('✅ Fazenda duplicada não existe — nada a fazer.')
  } else {
    const owners = await prisma.farmUser.findMany({
      where:  { farmId: DUP_FARM_ID },
      select: { userId: true, role: true, user: { select: { email: true } } },
    })

    const animals     = await prisma.animal.count({ where: { farmId: DUP_FARM_ID } })
    const vetReports  = await prisma.veterinaryReport.count({ where: { farmId: DUP_FARM_ID } })
    const snapshots   = await prisma.veterinaryAnimalSnapshot.count({ where: { farmId: DUP_FARM_ID } })
    const milkSessions = await prisma.milkingSession.count({ where: { farmId: DUP_FARM_ID } })
    const lots        = await prisma.lot.count({ where: { farmId: DUP_FARM_ID } })
    const pastures    = await prisma.pasture.count({ where: { farmId: DUP_FARM_ID } })
    const alerts      = await prisma.alert.count({ where: { farmId: DUP_FARM_ID } })
    const farmSettings = await prisma.farmSettings.count({ where: { farmId: DUP_FARM_ID } })
    const invites     = await prisma.invite.count({ where: { farmId: DUP_FARM_ID } })
    const auditLogs   = await prisma.auditLog.count({ where: { farmId: DUP_FARM_ID } })
    const reproductions = animals > 0
      ? await prisma.reproduction.count({ where: { animal: { farmId: DUP_FARM_ID } } })
      : 0
    const healthEvents = animals > 0
      ? await prisma.healthEvent.count({ where: { animal: { farmId: DUP_FARM_ID } } })
      : 0

    const safeToDelete = (
      animals === 0 && vetReports === 0 && snapshots === 0 &&
      milkSessions === 0 && lots === 0 && pastures === 0 &&
      alerts === 0 && reproductions === 0 && healthEvents === 0
    )

    console.log('┌─ ETAPA 1 — AUDITORIA FARM DUPLICADA ──────────────────')
    console.log(`│  farmId:      ${dupFarm.id}`)
    console.log(`│  name:        "${dupFarm.name}" (len=${dupFarm.name.length})`)
    console.log(`│  createdAt:   ${dupFarm.createdAt.toISOString()}`)
    console.log(`│  owners:      ${owners.map((o) => `${o.user.email} (${o.role})`).join(', ')}`)
    console.log(`│`)
    console.log(`│  animals:          ${animals}`)
    console.log(`│  vetReports:       ${vetReports}`)
    console.log(`│  snapshots:        ${snapshots}`)
    console.log(`│  milkingSessions:  ${milkSessions}`)
    console.log(`│  lots:             ${lots}`)
    console.log(`│  pastures:         ${pastures}`)
    console.log(`│  alerts:           ${alerts}`)
    console.log(`│  reproductions:    ${reproductions}`)
    console.log(`│  healthEvents:     ${healthEvents}`)
    console.log(`│  farmSettings:     ${farmSettings}`)
    console.log(`│  invites:          ${invites}`)
    console.log(`│  auditLogs:        ${auditLogs}`)
    console.log(`│`)
    console.log(`│  safeToDelete:  ${safeToDelete ? 'true ✅' : 'false ❌'}`)

    if (!safeToDelete) {
      console.log('\n❌ NÃO é seguro deletar — existem dados operacionais.')
      return
    }

    if (!DO_DELETE) {
      console.log('\n  ℹ️  Para deletar: adicione --delete')
    } else {
      // ── ETAPA 2 — Remover farm duplicada ──────────────────
      console.log('\n┌─ ETAPA 2 — REMOVENDO FARM DUPLICADA ──────────────────')

      await prisma.$transaction(async (tx) => {
        if (farmSettings > 0) {
          await tx.farmSettings.deleteMany({ where: { farmId: DUP_FARM_ID } })
          console.log('│  ✅ FarmSettings removidos')
        }
        if (invites > 0) {
          await tx.invite.deleteMany({ where: { farmId: DUP_FARM_ID } })
          console.log(`│  ✅ ${invites} Invite(s) removidos`)
        }
        if (auditLogs > 0) {
          await tx.auditLog.deleteMany({ where: { farmId: DUP_FARM_ID } })
          console.log(`│  ✅ ${auditLogs} AuditLog(s) removidos`)
        }
        await tx.farmUser.deleteMany({ where: { farmId: DUP_FARM_ID } })
        console.log('│  ✅ FarmUsers removidos')
        await tx.farm.delete({ where: { id: DUP_FARM_ID } })
        console.log(`│  ✅ Farm "${dupFarm.name}" (${DUP_FARM_ID}) deletada`)
      })

      console.log('│  ✅ Remoção concluída com sucesso.')
    }
  }

  // ── ETAPA 3 — Vincular admin@perdigao à farm_saldanha ─
  if (DO_LINK) {
    console.log('\n┌─ ETAPA 3 — VINCULAR USUÁRIO À FARM REAL ──────────────')

    const perdigaoUser = await prisma.user.findFirst({
      where:  { email: PERDIGAO_USER_EMAIL },
      select: { id: true, email: true, name: true },
    })
    if (!perdigaoUser) {
      console.log(`│  ⚠️  Usuário ${PERDIGAO_USER_EMAIL} não encontrado.`)
    } else {
      const existing = await prisma.farmUser.findFirst({
        where: { userId: perdigaoUser.id, farmId: REAL_FARM_ID },
      })
      if (existing) {
        console.log(`│  ℹ️  ${PERDIGAO_USER_EMAIL} já é ${existing.role} em farm_saldanha.`)
      } else {
        await prisma.farmUser.create({
          data: { userId: perdigaoUser.id, farmId: REAL_FARM_ID, role: 'OWNER' },
        })
        console.log(`│  ✅ ${PERDIGAO_USER_EMAIL} adicionado como OWNER em farm_saldanha (DEV ONLY)`)
      }
    }
  }

  // ── Estado final da farm real ─────────────────────────
  const realFarm      = await prisma.farm.findUnique({ where: { id: REAL_FARM_ID }, select: { id: true, name: true } })
  const realAnimals   = await prisma.animal.count({ where: { farmId: REAL_FARM_ID, status: 'ACTIVE' } })
  const realAlerts    = await prisma.alert.count({ where: { farmId: REAL_FARM_ID } })
  const realReports   = await prisma.veterinaryReport.count({ where: { farmId: REAL_FARM_ID, importStatus: 'IMPORTED' } })
  const realFarmUsers = await prisma.farmUser.findMany({
    where:  { farmId: REAL_FARM_ID },
    select: { role: true, user: { select: { email: true } } },
  })

  const totalFarms = await prisma.farm.count({ where: { name: { contains: 'Saldanha' } } })

  console.log('\n══ ESTADO FINAL — FARM_SALDANHA ══════════════════════════')
  console.log(`  farms com "Saldanha" no banco: ${totalFarms}`)
  console.log(`  farmId:    ${realFarm?.id}`)
  console.log(`  name:      "${realFarm?.name}"`)
  console.log(`  animais ativos:  ${realAnimals}`)
  console.log(`  alerts:          ${realAlerts}`)
  console.log(`  vet IMPORTED:    ${realReports}`)
  console.log('  FarmUsers:')
  realFarmUsers.forEach((fu) => console.log(`    ${fu.role.padEnd(10)}  ${fu.user.email}`))
  console.log('\n  Login para acessar os dados reais:')
  console.log('    Email: admin@saldanha.com.br  |  Senha: bovcontrol123')
  console.log('══════════════════════════════════════════════════════════\n')
}

main()
  .catch((e) => { console.error('\n❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
