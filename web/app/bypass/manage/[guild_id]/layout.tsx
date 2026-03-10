/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  AlertDialog, AlertDialogAction,
  AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Loader2, ArrowLeft, Bot, RefreshCw,
  LayoutDashboard, Settings2, Activity,
  Cog, FlaskConical, ChevronsUpDown, Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManageContext } from './context'
import type { discord_user, guild_info } from './context'

// - HELPERS - \\

const __guild_icon_url = (id: string, icon: string) =>
  `https://cdn.discordapp.com/icons/${id}/${icon}.webp?size=64`

const __nav_items = (guild_id: string) => [
  { label: 'Overview', href: `/bypass/manage/${guild_id}/overview`, icon: LayoutDashboard },
  { label: 'Bypass Management', href: `/bypass/manage/${guild_id}/bypass-management`, icon: Settings2 },
  { label: 'Activity Log', href: `/bypass/manage/${guild_id}/log`, icon: Activity },
  { label: 'Settings', href: `/bypass/manage/${guild_id}/settings`, icon: Cog },
]

// - SIDEBAR - \\

function AppSidebar({
  guild_id, user, guild, all_guilds, pathname,
}: {
  guild_id: string
  user: discord_user | null
  guild: guild_info | null
  all_guilds: guild_info[]
  pathname: string
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const nav = __nav_items(guild_id)

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon" className="border-r border-border">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    {guild?.icon ? (
                      <img
                        src={__guild_icon_url(guild.id, guild.icon)}
                        alt={guild.name}
                        className="size-8 rounded-lg"
                      />
                    ) : (
                      <span className="text-xs font-semibold">
                        {guild?.name.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{guild?.name ?? guild_id}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {guild?.member_count !== undefined 
                        ? `${guild.member_count.toLocaleString()} members` 
                        : 'Select server to manage'
                      }
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Your Servers
                </DropdownMenuLabel>
                {all_guilds.map((g, index) => (
                  <DropdownMenuItem
                    key={g.id}
                    onClick={() => router.push(`/bypass/manage/${g.id}`)}
                    className="gap-2 p-2 cursor-pointer"
                  >
                    <div className="flex size-6 items-center justify-center rounded-md border overflow-hidden shrink-0">
                      {g.icon ? (
                        <img
                          src={__guild_icon_url(g.id, g.icon)}
                          alt={g.name}
                          className="size-6 object-cover"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold">
                          {g.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="truncate">{g.name}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 p-2 cursor-pointer" onClick={() => router.push('/bypass/dashboard')}>
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent shrink-0">
                    <LayoutDashboard className="size-4" />
                  </div>
                  <div className="text-muted-foreground font-medium">Dashboard</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="h-8 w-8 rounded-lg">
                {user?.avatar && (
                  <AvatarImage
                    src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=64`}
                    alt={user.username}
                  />
                )}
                <AvatarFallback className="rounded-lg text-xs bg-muted text-muted-foreground">
                  {user?.username.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.username}</span>
                <span className="truncate text-xs text-muted-foreground">{user?.id}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

// - LAYOUT - \\

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams()
  const pathname = usePathname()
  const guild_id = params.guild_id as string

  const [user, set_user] = useState<discord_user | null>(null)
  const [guild, set_guild] = useState<guild_info | null>(null)
  const [all_guilds, set_all_guilds] = useState<guild_info[]>([])
  const [loading_auth, set_loading] = useState(true)
  const [bot_in_guild, set_bot] = useState(true)
  const [invite_url, set_invite] = useState('')
  const [checking_bot, set_checking] = useState(false)

  // - AUTH + GUILD CHECK - \\
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(async data => {
        if (!data.authenticated) {
          router.push(`/api/auth/discord?return_to=/bypass/manage/${guild_id}/overview`)
          return
        }
        set_user(data.user)

        const gr = await fetch('/api/bot-dashboard/guilds')
        if (!gr.ok) { router.push('/bypass/dashboard'); return }
        const gd = await gr.json()

        const guilds = gd.guilds as guild_info[] || []

        // Find current guild first to check access
        const found = guilds.find(g => g.id === guild_id)
        if (!found) { router.push('/bypass/dashboard'); return }
        set_guild(found)

        // Fetch bot status for all manageable guilds concurrently to filter the dropdown list
        const filtered_guilds: guild_info[] = []
        await Promise.allSettled(
          guilds.map(async g => {
            try {
              const sr = await fetch(`/api/bot-dashboard/${g.id}/bot-status`)
              if (sr.ok) {
                const sdata = await sr.json()
                if (sdata.in_guild || g.id === guild_id) {
                  filtered_guilds.push(g)
                }
              } else if (g.id === guild_id) {
                filtered_guilds.push(g)
              }
            } catch {
              if (g.id === guild_id) filtered_guilds.push(g)
            }
          })
        )

        // Sort them back to original order, since Promise.allSettled resolves out-of-order
        const sorted_filtered_guilds = guilds.filter(g => filtered_guilds.some(fg => fg.id === g.id))
        set_all_guilds(sorted_filtered_guilds)

        set_loading(false)
      })
      .catch(() => router.push('/login'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guild_id])

  // - BOT STATUS CHECK - \\
  const check_bot = useCallback(async () => {
    set_checking(true)
    try {
      const r = await fetch(`/api/bot-dashboard/${guild_id}/bot-status`)
      if (!r.ok) return
      const data = await r.json()
      set_bot(data.in_guild)
      set_invite(data.invite_url ?? '')
      
      if (data.member_count !== undefined) {
        set_guild(prev => prev ? { ...prev, member_count: data.member_count } : prev)
      }
    } catch {
      // - non-critical, assume bot is present - \\
    } finally {
      set_checking(false)
    }
  }, [guild_id])

  useEffect(() => {
    if (!loading_auth) check_bot()
  }, [loading_auth, check_bot])

  // - AUTO-POLL WHILE BOT NOT IN GUILD - \\
  useEffect(() => {
    if (loading_auth || bot_in_guild) return
    const interval = setInterval(check_bot, 6000)
    return () => clearInterval(interval)
  }, [loading_auth, bot_in_guild, check_bot])

  // - RE-CHECK ON TAB FOCUS WHEN DIALOG OPEN - \\
  useEffect(() => {
    if (loading_auth || bot_in_guild) return
    const on_visible = () => { if (document.visibilityState === 'visible') check_bot() }
    document.addEventListener('visibilitychange', on_visible)
    return () => document.removeEventListener('visibilitychange', on_visible)
  }, [loading_auth, bot_in_guild, check_bot])

  if (loading_auth) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="flex flex-col space-y-4 w-full max-w-4xl">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <ManageContext.Provider value={{ guild_id, user, guild, loading_auth }}>
      <SidebarProvider defaultOpen>
        <div className="flex h-screen bg-background overflow-hidden w-full">

          {/* - SIDEBAR - \\ */}
          <AppSidebar guild_id={guild_id} user={user} guild={guild} all_guilds={all_guilds} pathname={pathname} />

          {/* - MAIN CONTENT - \\ */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* - MOBILE HEADER - \\ */}
            <header className="flex h-14 md:hidden shrink-0 items-center gap-3 border-b border-border bg-background px-4">
              <SidebarTrigger className="-ml-1 shrink-0 text-muted-foreground hover:text-foreground" />
              <div className="flex items-center gap-3 w-full min-w-0">
                {guild?.icon ? (
                  <img
                    src={__guild_icon_url(guild.id, guild.icon)}
                    alt={guild.name}
                    className="w-6 h-6 rounded-md shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-semibold text-primary">
                      {guild?.name.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  </div>
                )}
                <span className="font-semibold text-sm truncate">{guild?.name ?? guild_id}</span>
              </div>
            </header>

            {/* - BETA NOTICE BAR - \\ */}
            <div className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium">
              <FlaskConical className="w-3 h-3 shrink-0" />
              Management dashboard is in <strong>beta</strong> — some features may be incomplete.
            </div>

            {/* - SCROLLABLE PAGE AREA - \\ */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>

          </div>

        </div>
      </SidebarProvider>

      {/* - BOT INVITE DIALOG - \\ */}
      <AlertDialog open={!bot_in_guild}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader className="flex flex-col items-start text-left gap-1.5">
            <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-sky-600/10 dark:bg-sky-400/10">
              <Bot className="size-4.5 text-sky-600 dark:text-sky-400" />
            </div>
            <AlertDialogTitle>Bot not in this server</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-sm mt-1">
              The bot has not been invited to <strong>{guild?.name ?? 'this server'}</strong> yet.
              Invite it first to start using the management dashboard.
            </AlertDialogDescription>
            <div className="w-full rounded-md border border-border/40 bg-muted/20 p-4 mt-3">
              <ol className="text-muted-foreground flex list-decimal flex-col gap-2.5 pl-4 text-[13px] leading-relaxed w-full marker:text-foreground/70 marker:font-medium">
                <li>Click <strong className="text-foreground/90 font-medium">Invite Bot</strong> below</li>
                <li>The server <strong className="text-foreground/90 font-medium">{guild?.name ?? 'your server'}</strong> will be pre-selected</li>
                <li>Authorize the requested permissions</li>
                <li>Return here — the dashboard will unlock automatically</li>
              </ol>
            </div>
            {checking_bot && (
              <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-sky-600 dark:text-sky-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking bot status...
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="mt-0 sm:mt-0" onClick={() => router.push('/bypass/dashboard')}>
              Go Back
            </AlertDialogCancel>
            <button
              onClick={check_bot}
              disabled={checking_bot}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm border border-border bg-muted/60 text-foreground hover:bg-muted transition-colors disabled:opacity-50 font-medium h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking_bot ? 'animate-spin' : ''}`} />
              Check Again
            </button>
            <AlertDialogAction
              className="w-full sm:w-auto bg-sky-600 text-white hover:bg-sky-700 focus-visible:ring-sky-600 dark:bg-sky-500 dark:hover:bg-sky-600 ml-0 sm:ml-2"
              onClick={() => {
                window.open(invite_url, '_blank')
                setTimeout(check_bot, 3000)
              }}
            >
              Invite Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </ManageContext.Provider>
  )
}

