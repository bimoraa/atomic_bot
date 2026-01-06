'use client'

import { cn } from '@/lib/utils'
import { FileText, Home, Settings, LogOut, ChevronLeft, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface dashboard_sidebar_props {
  user?: {
    id: string
    username: string
    avatar?: string
  }
  active_page?: 'transcripts' | 'home' | 'settings'
}

export function DashboardSidebar({ user, active_page = 'transcripts' }: dashboard_sidebar_props) {
  const router = useRouter()
  const [collapsed, set_collapsed] = useState(false)
  const [mobile_open, set_mobile_open] = useState(false)

  const nav_items = [
    { id: 'home', label: 'Home', icon: Home, href: '/' },
    { id: 'transcripts', label: 'Transcripts', icon: FileText, href: '/dashboard' },
    { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
  ]

  const handle_logout = () => {
    document.cookie = 'discord_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    router.push('/login')
  }

  return (
    <>
      {/* - MOBILE MENU BUTTON - \\ */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => set_mobile_open(!mobile_open)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-card border border-border shadow-md"
      >
        {mobile_open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* - MOBILE OVERLAY - \\ */}
      {mobile_open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => set_mobile_open(false)}
        />
      )}

      {/* - SIDEBAR - \\ */}
      <aside
        className={cn(
          'fixed top-4 bottom-4 bg-card border border-border rounded-2xl transition-all duration-300 flex flex-col shadow-lg backdrop-blur-sm z-40',
          // Desktop
          'hidden lg:flex lg:left-4',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          // Mobile
          mobile_open ? 'flex left-4 right-4 max-w-xs' : 'hidden'
        )}
      >
      {/* - HEADER - \\ */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <img src="/atomc.svg" alt="Atomic" className="w-7 h-7" />
          <span className={cn(
            "text-foreground font-semibold transition-opacity",
            collapsed && "lg:hidden"
          )}>Atomic</span>
        </div>
        {/* - DESKTOP COLLAPSE BUTTON - \\ */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => set_collapsed(!collapsed)}
          className="hidden lg:flex hover:bg-accent text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* - NAVIGATION - \\ */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        <div className="space-y-1">
          {nav_items.map((item) => {
            const Icon = item.icon
            const is_active = active_page === item.id

            return (
              <button
                key={item.id}
                onClick={() => {
                  router.push(item.href)
                  set_mobile_open(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  is_active
                    ? 'bg-primary text-primary-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  collapsed && 'justify-center'
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* - USER SECTION - \\ */}
      <div className="border-t border-border p-2">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg mb-2',
              collapsed && 'justify-center'
            )}
          >
            {user.avatar ? (
              <img
                src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`}
                alt={user.username}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-foreground text-xs">{user.username[0]}</span>
              </div>
            )}
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">{user.username}</div>
                <div className="text-xs text-muted-foreground">Admin</div>
              </div>
            )}
          </div>
        )}

        <Button
          variant="ghost"
          onClick={handle_logout}
          className={cn(
            'w-full flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-accent',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
    </>
  )
}
