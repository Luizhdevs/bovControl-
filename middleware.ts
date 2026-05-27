import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Middleware de autenticação + observabilidade.
 *
 * Adiciona:
 *   x-request-id  — UUID único por requisição (para correlação de logs)
 *   x-response-time — tempo do middleware em ms (não inclui renderização)
 *
 * Protege todas as rotas da área autenticada.
 * Redireciona para /login se não autenticado.
 */
export default auth((req) => {
  const start     = Date.now()
  const requestId = crypto.randomUUID()

  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Rotas públicas — sem proteção de autenticação
  const publicPrefixes = [
    '/login',
    '/register',
    '/api/auth',
    '/invite',          // /invite/[token] — pública por design
    '/_next',
    '/favicon',
    '/manifest',
    '/icons',
    '/sw.js',
  ]
  const isPublic = publicPrefixes.some((p) => pathname.startsWith(p))

  if (!isPublic && !isAuthenticated) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const response = NextResponse.next()
  response.headers.set('x-request-id',    requestId)
  response.headers.set('x-response-time', `${Date.now() - start}ms`)
  return response
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)',
  ],
}
