'use client'

// - main topbar — floating glass nav, sirius.menu-inspired - \\
import { useState, useEffect }    from "react"
import Link                       from "next/link"
import { usePathname }            from "next/navigation"
import Image                      from "next/image"
import { AtomicLogo }             from "@/components/icons/atomic_logo"
import { cn }                     from "@/lib/utils"

interface nav_item {
  label : string
  href  : string
}

interface topbar_props {
  user?: {
    id         : string
    username   : string
    avatar?    : string
    avatar_url?: string
  } | null
}

const __nav_items: nav_item[] = [
  { label: "Home",      href: "/"                  },
  { label: "Bypass",    href: "/bypass"             },
  { label: "Suggest",   href: "/suggested-feature"  },
  { label: "Staff",     href: "/staff-information"  },
]

const __discord_url = process.env.NEXT_PUBLIC_DISCORD_URL || "https://discord.gg/getsades"

/**
 * @description floating glass topbar component
 * @param user - authenticated discord user, if any
 * @returns topbar JSX
 */
export function MainTopbar({ user }: topbar_props) {
  const pathname     = usePathname()
  const [scrolled, set_scrolled] = useState(false)

  useEffect(() => {
    const on_scroll = () => set_scrolled(window.scrollY > 12)
    window.addEventListener("scroll", on_scroll, { passive: true })
    return () => window.removeEventListener("scroll", on_scroll)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "py-2"
          : "py-4",
      )}
    >
      <div className="max-w-5xl mx-auto px-4">
        <nav
          className={cn(
            "flex items-center justify-between px-4 h-12 rounded-2xl border transition-all duration-300",
            scrolled
              ? "bg-[#0c0c0e]/90 border-white/[0.07] backdrop-blur-xl shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
              : "bg-[#0c0c0e]/70 border-white/[0.06] backdrop-blur-md shadow-[0_2px_16px_rgba(0,0,0,0.3)]",
          )}
        >
          {/* - brand - */}
          <Link href="/" className="flex items-center shrink-0">
            <AtomicLogo className="w-5 h-5 text-white" />
          </Link>

          {/* - nav links - */}
          <div className="hidden md:flex items-center gap-1">
            {__nav_items.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-1.5 rounded-lg text-sm transition-all duration-150",
                    active
                      ? "text-white bg-white/[0.08]"
                      : "text-white/50 hover:text-white/90 hover:bg-white/[0.05]",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* - right action - */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 bg-white/5">
                {(user.avatar_url || user.avatar) ? (
                  <Image
                    src={user.avatar_url ?? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`}
                    alt={user.username}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <a
                href={__discord_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/[0.08] border border-white/[0.08] hover:bg-white/[0.12] hover:border-white/[0.14] transition-all duration-150"
              >
                <svg width="14" height="11" viewBox="0 0 24 18" fill="currentColor" className="text-[#5865F2]">
                  <path d="M20.317 1.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 0C6.845.29 5.205.8 3.677 1.492a.07.07 0 0 0-.032.027C.533 6.093-.32 10.56.099 14.971a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963a.074.074 0 0 0-.041-.104 13.2 13.2 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .077-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028z"/>
                </svg>
                Discord
              </a>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
