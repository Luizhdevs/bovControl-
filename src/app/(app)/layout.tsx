import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  PawPrint,
  Layers2,
  MapPin,
  MilkIcon,
  Heart,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth'

const NAV_ITEMS = [
  { href: '/',              icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/animals',       icon: PawPrint,        label: 'Animais'   },
  { href: '/lots',          icon: Layers2,         label: 'Lotes'     },
  { href: '/pastures',      icon: MapPin,          label: 'Pastos'    },
  { href: '/milk',          icon: MilkIcon,        label: 'Leite'     },
  { href: '/reproduction',  icon: Heart,           label: 'Reprodução' },
  { href: '/alerts',        icon: Bell,            label: 'Alertas'   },
  { href: '/settings',      icon: Settings,        label: 'Config.'   },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header (mobile) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐄</span>
          <span className="font-bold text-lg tracking-tight">BovControl</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:block">
            {session.user.name}
          </span>
          <form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }) }}>
            <Button variant="ghost" size="sm" type="submit">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* Conteúdo com nav lateral no desktop, nav inferior no mobile */}
      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card/50 p-3 gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'text-sm font-medium text-muted-foreground',
                'hover:bg-muted hover:text-foreground transition-colors',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </aside>

        {/* Área de conteúdo */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
            >
              <item.icon className="size-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
