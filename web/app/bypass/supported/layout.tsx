/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import type { Metadata }  from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title       : 'Supported Sites — Atomic',
  description : 'List of all supported sites and services supported by Atomic Bypasser.',
}

export default function SupportedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
