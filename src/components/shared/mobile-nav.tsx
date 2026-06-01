'use client'

import { useState } from 'react'
import Link         from 'next/link'
import {
  MoreHorizontal, X,
  LayoutDashboard, PawPrint, MilkIcon, Wheat, Activity,
  Heart, Layers2, MapPin, Bell, Settings, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href:      string
  label:     string
  icon:      React.ElementType
  hasBadge?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',              icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/animals',       icon: PawPrint,        label: 'Animais'    },
  { href: '/milk',          icon: MilkIcon,        label: 'Leite'      },
  { href: '/feed',          icon: Wheat,           label: 'Ração'      },
  { href: '/health-events', icon: Activity,        label: 'Saúde'      },
  { href: '/reproduction',  icon: Heart,           label: 'Reprodução' },
  { href: '/lots',          icon: Layers2,         label: 'Lotes'      },
  { href: '/pastures',      icon: MapPin,          label: 'Pastos'     },
  { href: '/feed-types',    icon: Wheat,           label: 'Rações'     },
  { href: '/alerts',        icon: Bell,            label: 'Alertas',   hasBadge: true },
  { href: '/settings',      icon: Settings,        label: 'Config.'    },
]

interface MobileNavProps {
  alertCount: number
  showAudit?: boolean
}

export function MobileNav({ alertCount, showAudit = false }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const pinned = NAV_ITEMS.slice(0, 4)
  const rest   = [
    ...NAV_ITEMS.slice(4),
    ...(showAudit ? [{ href: '/audit', icon: ClipboardList, label: 'Auditoria' } as NavItem] : []),
  ]

  return (
    <>
      {/* Bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md">
        <div className="flex items-center justify-around px-2 py-2">
          {pinned.map((item) => (
            <NavLink key={item.href} item={item} alertCount={alertCount} />
          ))}

          {/* Mais */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] justify-center"
          >
            <MoreHorizontal className="size-5" />
            <span className="text-[10px] font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* Overlay + drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl p-4 pb-8 space-y-1 animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-muted-foreground">Mais opções</span>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {rest.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted transition-colors text-center"
                >
                  <div className="relative">
                    <item.icon className="size-6 text-muted-foreground" />
                    {item.hasBadge && alertCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
                        {alertCount > 9 ? '9+' : alertCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}

function NavLink({ item, alertCount }: { item: NavItem; alertCount: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg',
        'text-muted-foreground hover:text-foreground transition-colors',
        'min-w-[44px] min-h-[44px] justify-center',
      )}
    >
      <div className="relative">
        <item.icon className="size-5" />
        {item.hasBadge && alertCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-destructive-foreground">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  )
}
