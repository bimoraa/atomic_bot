import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Supported Sites — Atomic',
  description : 'List of all supported sites and services supported by Atomic Bypasser.',
}

export default function SupportedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
