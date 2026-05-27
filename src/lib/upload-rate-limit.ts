/**
 * upload-rate-limit.ts — Rate limiter em memória para uploads.
 *
 * Janela deslizante: 20 uploads por minuto por usuário.
 * Map limpo a cada TTL para evitar vazamento de memória em rotas de longa duração.
 *
 * Não usa Redis — adequado para instância única (Vercel Serverless garante
 * função por região, e o limite é contra uso abusivo acidental, não ataques
 * distribuídos que precisariam de coordenação cross-instance).
 */

// ─── Configuração ──────────────────────────────────────────────────────────

const WINDOW_MS    = 60_000   // 1 minuto
const MAX_REQUESTS = 20       // uploads por janela

// ─── Estado interno ────────────────────────────────────────────────────────

type Entry = { timestamps: number[] }

// Singleton por módulo (warm lambda / dev server)
const map = new Map<string, Entry>()

// Limpeza periódica para não acumular chaves de usuários inativos
let cleanupTimer: ReturnType<typeof setTimeout> | null = null

function scheduleCleanup(): void {
  if (cleanupTimer) return
  cleanupTimer = setTimeout(() => {
    const now = Date.now()
    for (const [key, entry] of map) {
      entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)
      if (entry.timestamps.length === 0) map.delete(key)
    }
    cleanupTimer = null
  }, WINDOW_MS * 2)
}

// ─── API pública ───────────────────────────────────────────────────────────

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number }

/**
 * Verifica e registra uma tentativa de upload para `userId`.
 * Retorna `{ allowed: true }` se dentro do limite ou
 * `{ allowed: false, retryAfterMs }` caso contrário.
 */
export function checkUploadRateLimit(userId: string): RateLimitResult {
  const now   = Date.now()
  const entry = map.get(userId) ?? { timestamps: [] }

  // Remove timestamps fora da janela deslizante
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS)

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest       = entry.timestamps[0]!
    const retryAfterMs = WINDOW_MS - (now - oldest)
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) }
  }

  entry.timestamps.push(now)
  map.set(userId, entry)
  scheduleCleanup()

  return { allowed: true }
}

/**
 * Retorna quantos uploads restam na janela atual (para headers informativos).
 */
export function getRemainingUploads(userId: string): number {
  const now       = Date.now()
  const entry     = map.get(userId)
  const recentCnt = entry
    ? entry.timestamps.filter((t) => now - t < WINDOW_MS).length
    : 0
  return Math.max(0, MAX_REQUESTS - recentCnt)
}
