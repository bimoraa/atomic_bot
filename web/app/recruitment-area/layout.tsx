'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { AppSidebar } from '@/components/shadcn-space/blocks/sidebar-01/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'

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
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="dark bg-background text-foreground min-h-screen font-sans">
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex-1 min-w-0 overflow-y-auto">
            <main className="container mx-auto px-4 py-8 max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  )
}
