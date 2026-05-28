import { auth }                  from '@/lib/auth'
import { redirect }              from 'next/navigation'
import { getActiveFarm }         from '@/lib/active-farm'
import { getUserFarms }          from '@/modules/farms/queries'
import { getPendingAlertCount }  from '@/modules/alerts/queries'
import { FarmSwitcher }          from '@/components/shared/farm-switcher'
import { SyncProvider }          from '@/components/providers/sync-provider'
import { SyncIndicator }         from '@/components/shared/sync-indicator'
import Link                      from 'next/link'
import {
  LayoutDashboard,
  PawPrint,
  Activity,
  Layers2,
  MapPin,
  MilkIcon,
  Heart,
  Bell,
  Settings,
  LogOut,
  Wheat,
} from 'lucide-react'
import { cn }     from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth'

// ─── Nav items ────────────────────────────────────────────
// Ordem importa: os primeiros 5 aparecem na bottom nav mobile.

const NAV_ITEMS = [
  { href: '/',               icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/animals',        icon: PawPrint,        label: 'Animais'    },
  { href: '/milk',           icon: MilkIcon,        label: 'Leite'      },
  { href: '/feed',           icon: Wheat,           label: 'Ração'      },
  { href: '/health-events',  icon: Activity,        label: 'Saúde'      },
  { href: '/reproduction',   icon: Heart,           label: 'Reprodução' },
  { href: '/lots',           icon: Layers2,         label: 'Lotes'      },
  { href: '/pastures',       icon: MapPin,          label: 'Pastos'     },
  { href: '/feed-types',     icon: Wheat,           label: 'Rações'     },
  { href: '/alerts',         icon: Bell,            label: 'Alertas', hasBadge: true },
  { href: '/settings',       icon: Settings,        label: 'Config.'    },
] as const

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const [activeFarm, allFarms] = await Promise.all([
    getActiveFarm(session.user.id),
    getUserFarms(session.user.id),
  ])

  if (!activeFarm) redirect('/onboarding')

  const alertCount = await getPendingAlertCount(activeFarm.farmId)
  const canCreate  = allFarms.some((f) => f.role === 'OWNER')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-2xl">🐄</span>
          <span className="font-bold text-lg tracking-tight hidden sm:block">BovControl</span>
        </div>

        {/* Farm switcher */}
        <div className="flex-1 min-w-0">
          <FarmSwitcher
            farms={allFarms}
            activeFarmId={activeFarm.farmId}
            canCreate={canCreate}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          <SyncIndicator />
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
              <span className="flex-1">{item.label}</span>
              {'hasBadge' in item && item.hasBadge && alertCount > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
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

      {/* Bottom nav mobile — mostra os 5 primeiros itens */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
            >
              <div className="relative">
                <item.icon className="size-5" />
                {'hasBadge' in item && item.hasBadge && alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* SyncProvider — gerencia sync offline sem renderizar nada visível */}
      <SyncProvider />
    </div>
  )
}
