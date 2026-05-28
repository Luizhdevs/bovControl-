/**
 * Called once at app boot in production to verify all required env vars are present.
 * Throws with a clear message listing missing vars so deploy errors are obvious.
 */
export function checkProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') return

  const required: Record<string, string[]> = {
    'Auth / NextAuth': ['NEXTAUTH_SECRET', 'NEXTAUTH_URL'],
    'Database':        ['DATABASE_URL'],
    'OAuth (Google)':  ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    'Storage (R2)':    ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'],
  }

  const missing: string[] = []
  for (const [group, vars] of Object.entries(required)) {
    for (const v of vars) {
      if (!process.env[v]) missing.push(`  [${group}] ${v}`)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables:\n${missing.join('\n')}\n\nSet these in your deployment platform before starting the server.`,
    )
  }
}
