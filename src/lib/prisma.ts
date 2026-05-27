import { PrismaClient, Prisma } from '@prisma/client'

// Singleton global — impede multiple instances em hot-reload (dev)
// e também em serverless onde o módulo pode ser re-avaliado entre invocações.
const globalForPrisma = globalThis as unknown as {
  prisma:               PrismaClient | undefined
  prismaSlowQueryBound: boolean | undefined
}

// Threshold para classificar uma query como lenta (ms)
const SLOW_QUERY_MS = 200

function makePrismaClient(): PrismaClient {
  const isDev = process.env.NODE_ENV === 'development'

  const client = new PrismaClient({
    log: isDev
      ? [
          { level: 'query', emit: 'event'  },
          { level: 'error', emit: 'stdout' },
          { level: 'warn',  emit: 'stdout' },
        ]
      : [{ level: 'error', emit: 'stdout' }],
  })

  if (isDev && !globalForPrisma.prismaSlowQueryBound) {
    globalForPrisma.prismaSlowQueryBound = true
    // Alerta para queries lentas — útil para detectar N+1 e full scans
    client.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration >= SLOW_QUERY_MS) {
        const q = e.query.slice(0, 250).replace(/\s+/g, ' ')
        console.warn(
          `⚠️  [slow-query] ${e.duration}ms | ${q}`,
        )
      }
    })
  }

  return client
}

export const prisma = globalForPrisma.prisma ?? makePrismaClient()

// Preserva a instância no objeto global para ser reutilizada.
globalForPrisma.prisma = prisma
