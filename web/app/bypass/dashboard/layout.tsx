import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Bypass Dashboard — Atomic',
  description : 'Manage bypass bot settings for your servers.',
}

export default function BypassDashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
