import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'ProDeTe — Atomic',
  description : 'Staff productivity, dedication, and teamwork performance report.',
}

export default function ProdeteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
