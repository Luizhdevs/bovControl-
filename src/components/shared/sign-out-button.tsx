'use client'

import { signOut } from 'next-auth/react'
import { Button }  from '@/components/ui/button'
import { LogOut }  from 'lucide-react'

/**
 * Botão de logout client-side.
 * Usa next-auth/react em vez de Server Action — evita bug do next-auth beta
 * com useReducer em contexto de Server Component no Next.js 15 + Turbopack.
 */
export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => signOut({ callbackUrl: '/login' })}
    >
      <LogOut className="size-4" />
    </Button>
  )
}
