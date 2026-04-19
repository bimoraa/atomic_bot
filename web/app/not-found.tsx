/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import Link          from 'next/link'
import { AtomicLogo } from '@/components/icons/atomic_logo'

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col">

      {/* - red blur glow - */}
      <div
        className="pointer-events-none fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-20 blur-3xl rounded-full z-0"
        style={{ background: "radial-gradient(ellipse, #ef4444 0%, transparent 70%)" }}
      />

      {/* - topbar - */}
      <header className="py-4 relative z-10">
        <div className="max-w-3xl mx-auto px-5">
          <nav className="flex items-center justify-between px-4 h-11 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <AtomicLogo className="w-4 h-4 text-white/60" />
              <span className="text-sm text-white/40 font-medium">Atomic</span>
            </Link>
            <Link
              href="/"
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Go back home →
            </Link>
          </nav>
        </div>
      </header>

      {/* - content - */}
      <div className="flex-1 flex items-center justify-center px-5 relative z-10">
        <div className="max-w-lg w-full">
          <p
            className="text-[4rem] sm:text-[5rem] font-semibold leading-none text-white mb-6 tracking-tight"
          >
            404
          </p>
          <p className="text-[#888] text-sm leading-relaxed mb-1">
            This page ain’t here, might not exist or something broke on our end.
          </p>
          <p className="text-[#888] text-sm leading-relaxed mb-8">
            You sure you’re in the right place?
          </p>
          <Link
            href="/"
            className="text-sm text-white/40 hover:text-white/70 transition-colors"
          >
            Go back home →
          </Link>
        </div>
      </div>

    </div>
  )
}

