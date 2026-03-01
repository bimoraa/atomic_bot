import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Login — Atomic',
  description : 'Sign in to the Atomic staff dashboard.',
}

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
