import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Bypass — Atomic',
  description : 'Bypass shortlinks and ad links instantly with Atomic Bypasser.',
}

export default function BypassLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
