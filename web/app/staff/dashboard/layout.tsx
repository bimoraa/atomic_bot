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
import AppSidebar from '@/components/shadcn-space/blocks/dashboard-shell-01/app-sidebar'
import { Skeleton } from '@/components/ui/skeleton'

export type DiscordUser = {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
};

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, set_loading] = useState(true)
  const [user, set_user] = useState<DiscordUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          router.push(`/api/auth/discord?return_to=/staff/dashboard`)
          return
        }
        set_user(data.user)
        set_loading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground dark p-8">
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
    <div className="dark bg-background text-foreground min-h-screen font-sans overflow-hidden">
      <AppSidebar user={user}>
        <div className="w-full p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-y-auto">
          {children}
        </div>
      </AppSidebar>
    </div>
  )
}
