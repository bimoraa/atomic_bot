"use client"

import { usePathname }          from 'next/navigation'
import { LayoutDashboard, BarChart2, FileText, Settings, Users } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { NavMain }              from '@/components/shadcn-space/blocks/dashboard-shell-01/nav-main'
import { SiteHeader }           from '@/components/shadcn-space/blocks/dashboard-shell-01/site-header'

// - nav item type, shared with nav-main - \\
export type NavItem = {
  title?    : string
  label?    : string
  href?     : string
  icon?     : React.ElementType
  isActive? : boolean
  isSection?: boolean
  children? : NavItem[]
}

// - sidebar nav items definition - \\
const __nav_items: NavItem[] = [
  { title: 'Dashboard',   href: '/dashboard-shell-01',          icon: LayoutDashboard },
  { title: 'Analytics',   href: '/dashboard-shell-01/analytics', icon: BarChart2       },
  { title: 'Reports',     href: '/dashboard-shell-01/reports',   icon: FileText        },
  { title: 'Users',       href: '/dashboard-shell-01/users',     icon: Users           },
  { title: 'Settings',    href: '/dashboard-shell-01/settings',  icon: Settings        },
]

/**
 * @description app sidebar shell wrapper for dashboard-shell-01
 * @param children page content rendered in the inset area
 * @returns sidebar + content layout
 */
export default function AppSidebar({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/dashboard-shell-01">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Dashboard</span>
                    <span className="truncate text-xs text-muted-foreground">Shell 01</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={__nav_items} />
        </SidebarContent>

        <SidebarFooter />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b border-border/40 bg-background/50 px-4">
          <SiteHeader />
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
