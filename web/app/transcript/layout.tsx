import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Transcript — Atomic',
  description : 'Ticket transcript viewer.',
}

export default function TranscriptLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
