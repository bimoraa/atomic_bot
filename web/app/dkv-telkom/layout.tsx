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
  title       : 'DKV Telkom University — Desain Komunikasi Visual',
  description : 'Program Desain Komunikasi Visual (DKV) Telkom University, Fakultas Industri Kreatif. Terakreditasi A BAN-PT dan akreditasi internasional ASIC.',
  openGraph   : {
    title       : 'DKV Telkom University',
    description : 'Program S1 Desain Komunikasi Visual unggulan di Indonesia.',
    type        : 'website',
  },
}

export default function DKVTelkomLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
