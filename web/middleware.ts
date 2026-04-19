/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - subdomain router — rewrites status.domain to /status internally - \\
import { NextRequest, NextResponse } from "next/server"

const __subdomain_routes: Record<string, string> = {
  status: "/status",
  blog  : "/atomic_hub/blog",
}

export function middleware(request: NextRequest): NextResponse {
  const host     = request.headers.get("host") ?? ""
  const parts    = host.split(".")

  // - only act when there are 3+ parts (subdomain.domain.tld) - \\
  if (parts.length < 3) return NextResponse.next()

  const subdomain = parts[0].toLowerCase()
  const target    = __subdomain_routes[subdomain]

  if (!target) return NextResponse.next()

  const { pathname, search } = request.nextUrl

  // - already on the target path, skip to avoid infinite rewrite - \\
  if (pathname.startsWith(target)) return NextResponse.next()

  const url = request.nextUrl.clone()
  url.pathname = target + (pathname === "/" ? "" : pathname)
  url.search   = search

  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    // - run on all paths except Next.js internals and static files - \\
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
}
