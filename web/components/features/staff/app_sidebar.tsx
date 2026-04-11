"use client"

import { usePathname }    from 'next/navigation'
import { LayoutDashboard, DollarSign, Activity, FileText } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// - discord user type - \\
export type DiscordUser = {
  id           : string
  username     : string
  avatar       : string
  discriminator: string
}

// - nav definition - \\
const __nav_items = [
  { title: 'Overview',    href: '/staff/dashboard',             icon: LayoutDashboard },
  { title: 'Salary',      href: '/staff/dashboard/salary',      icon: DollarSign      },
  { title: 'Activity',    href: '/staff/dashboard/activity',    icon: Activity        },
  { title: 'Transcripts', href: '/staff/dashboard/transcripts', icon: FileText        },
]

const __avatar_url = (id: string, hash: string) =>
  `https://cdn.discordapp.com/avatars/${id}/${hash}.webp?size=64`

/**
 * @description staff dashboard sidebar layout wrapper
 * @param user   authenticated discord user from session
 * @param children page content rendered in the inset area
 * @returns sidebar + content layout
 */
export default function AppSidebar({
  user,
  children,
}: {
  user    : DiscordUser
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-border">

        <SidebarHeader className="px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <a href="/staff/dashboard">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Staff Panel</span>
                    <span className="truncate text-xs text-muted-foreground">Atomic Bot</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarMenu className="px-2 gap-1">
            {__nav_items.map(item => {
              const is_active = pathname === item.href
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton tooltip={item.title} isActive={is_active} asChild>
                    <a href={item.href}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="gap-3 pointer-events-none">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={__avatar_url(user.id, user.avatar)} alt={user.username} />
                  <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.username}</span>
                  <span className="truncate text-xs text-muted-foreground">Staff</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b border-border/40 bg-zinc-950/50 px-6 lg:hidden">
          <SidebarTrigger className="-ml-2 text-zinc-400 hover:text-white" />
          <div className="font-semibold text-sm">Staff Panel</div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>

    </SidebarProvider>
  )
}
