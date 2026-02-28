import { Metadata } from 'next'

export const metadata: Metadata = {
  title       : 'Bot Management — Atomic',
  description : 'Manage bypass settings for your Discord servers.',
}

export default function BotDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
