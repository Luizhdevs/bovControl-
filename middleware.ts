import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * Middleware de autenticação.
 * Protege todas as rotas da área autenticada (/app).
 * Redireciona para /login se não autenticado.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl
  const isAuthenticated = !!req.auth

  // Rotas públicas — sem proteção
  const publicPaths = ['/login', '/register', '/api/auth']
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))

  if (isPublicPath) return NextResponse.next()

  // Redireciona para login se não autenticado
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  // Aplica o middleware em todas as rotas, exceto assets estáticos
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js).*)',
  ],
}
