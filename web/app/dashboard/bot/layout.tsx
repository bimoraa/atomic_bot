/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Metadata } from 'next'

export const metadata: Metadata = {
  title       : 'Bot Management — Atomic',
  description : 'Manage bypass settings for your Discord servers.',
}

export default function BotDashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
