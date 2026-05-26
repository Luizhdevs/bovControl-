import { PrismaClient } from '@prisma/client'

// Singleton global — impede multiple instances em hot-reload (dev)
// e também em ambiente serverless (Vercel) onde o módulo pode ser
// re-avaliado entre invocações no mesmo processo.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Preserva a instância no objeto global para ser reutilizada.
// Aplica-se em TODOS os ambientes — inclusive produção/Vercel —
// para evitar esgotamento do pool de conexões entre re-avaliações.
globalForPrisma.prisma = prisma
