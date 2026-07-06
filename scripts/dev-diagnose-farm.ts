/**
 * DEV ONLY — diagnóstico das duas Fazenda Saldanha e usuário logado.
 */
import { prisma } from '../src/lib/prisma'

async function main() {
  console.log('\nDATABASE_URL:', (process.env.DATABASE_URL ?? 'NÃO DEFINIDA').replace(/\/\/[^:]*:[^@]*@/, '//USER:****@'))

  // ── Duas fazendas Saldanha ─────────────────────────────
  const farms = await prisma.farm.findMany({
    where:   { name: { contains: 'Saldanha' } },
    select:  { id: true, name: true, state: true, city: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\nFarms contendo "Saldanha":')
  farms.forEach((f) => {
    console.log(`  id="${f.id}"`)
    console.log(`  name="${f.name}" (len=${f.name.length})`)
    console.log(`  createdAt=${f.createdAt.toISOString()}`)
    console.log('')
  })

  // ── FarmUsers de cada uma ──────────────────────────────
  for (const f of farms) {
    const fu = await prisma.farmUser.findMany({
      where:  { farmId: f.id },
      select: { userId: true, role: true, user: { select: { email: true, name: true } } },
    })
    console.log(`FarmUsers de "${f.name}" (${f.id}):`)
    if (fu.length === 0) console.log('  (nenhum)')
    fu.forEach((u) => console.log(`  ${u.role.padEnd(8)}  ${u.user.email}  [${u.user.name}]  userId=${u.userId}`))
    console.log('')
  }

  // ── Verificar usuário real da sessão ───────────────────
  const candidateEmails = ['luizdevph@gmail.com', 'admin@saldanha.com.br', 'luiz@bovcontrol.com']
  console.log('Verificando usuários de sessão candidatos:')
  for (const email of candidateEmails) {
    const u = await prisma.user.findFirst({ where: { email }, select: { id: true, email: true, name: true } })
    if (u) {
      console.log(`  ENCONTRADO: ${u.email}  name="${u.name}"  id=${u.id}`)
      // Fazendas acessíveis
      const acc = await prisma.farmUser.findMany({
        where:  { userId: u.id },
        select: { farmId: true, role: true, farm: { select: { name: true } } },
      })
      acc.forEach((a) => console.log(`    → farmId=${a.farmId}  name="${a.farm.name}"  role=${a.role}`))
    } else {
      console.log(`  não existe: ${email}`)
    }
  }

  // ── Todos os usuários ─────────────────────────────────
  console.log('\nTodos os usuários no banco:')
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true } })
  users.forEach((u) => console.log(`  ${u.email.padEnd(35)}  id=${u.id}  name="${u.name}"`))

  // ── Verificar cookie / session ─────────────────────────
  // (Isso só é possível no server — aqui mostramos a config do auth)
  console.log('\nVerificando tabelas de sessão (Auth.js):')
  try {
    const sessions = await (prisma as any).session.findMany({ take: 5, select: { userId: true, expires: true } })
    sessions.forEach((s: any) => console.log(`  userId=${s.userId}  expires=${s.expires}`))
  } catch {
    console.log('  (sem tabela de session — Auth.js JWT mode)')
  }
  try {
    const accounts = await (prisma as any).account.findMany({ take: 10, select: { userId: true, provider: true, providerAccountId: true } })
    console.log('Accounts (OAuth):')
    accounts.forEach((a: any) => console.log(`  userId=${a.userId}  provider=${a.provider}  provId=${a.providerAccountId}`))
  } catch {
    console.log('  (sem tabela de account)')
  }
}

main()
  .catch((e) => { console.error('\n❌ Erro:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
