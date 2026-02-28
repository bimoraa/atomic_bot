import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Credits — Atomic',
  description : 'Credits and acknowledgements for Atomic Bypasser.',
}

export default function CreditsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
