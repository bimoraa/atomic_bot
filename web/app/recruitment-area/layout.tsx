/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from '@/components/shadcn-space/blocks/sidebar-01/app-sidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider }                  from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { Skeleton } from '@/components/ui/skeleton'

export default function RecruitmentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, set_loading] = useState(true)
  const [authorized, set_authorized] = useState(false)

  useEffect(() => {
    fetch('/api/auth/recruitment-access')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.push(`/api/auth/discord?return_to=/recruitment-area/dashboard`)
          return
        }
        if (!data.authorized) {
          router.push('/') // Redirect non-authorized users to home
          return
        }
        set_authorized(true)
        set_loading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  if (loading || !authorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground dark">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen font-sans">
      <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            <header className="flex h-14 items-center gap-4 border-b border-border/40 bg-zinc-950/50 px-6 lg:hidden">
              <SidebarTrigger className="-ml-2 text-zinc-400 hover:text-white" />
              <div className="font-semibold text-sm">Recruitment Area</div>
            </header>
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
      </TooltipProvider>
      <Toaster position="top-center" theme="dark" className="pointer-events-auto" />
    </div>
  )
}
