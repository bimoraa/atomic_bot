/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

"use client"

import { useEffect, useRef, useState } from "react"
import Link                            from "next/link"
import { cn }                          from "@/lib/utils"
import { AtomicLogo }                  from "@/components/icons/atomic_logo"
import { Sparkles, Calendar, Clock }   from "lucide-react"

// !!! mermaid flowchart definitions !!! \\

const __invite_tracking_chart = `
flowchart TD
  A["CC creates invite link"] --> B["User joins via CC's invite"]
  B --> C{"Inviter has CC role?"}
  C -->|Yes| D["Store to cc_invites DB"]
  C -->|No| E["Skip — not a CC"]
  D --> F["Increment CC invite count"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#3BA55D,stroke:#2D7D46,color:#fff
  style C fill:#FAA61A,stroke:#C7850F,color:#fff
  style D fill:#5865F2,stroke:#4752C4,color:#fff
  style E fill:#ED4245,stroke:#C73638,color:#fff
  style F fill:#3BA55D,stroke:#2D7D46,color:#fff
`

const __salary_earning_chart = `
flowchart TD
  A["Payment approved by admin"] --> B["Lookup cc_invites: who invited buyer?"]
  B --> C{"CC invite found?"}
  C -->|Yes| D{"CC still has CC role?"}
  C -->|No| E["No commission — skip"]
  D -->|Yes| F["Add Rp 2.500 to cc_salary"]
  D -->|No| G["Skip — role removed"]
  F --> H["Log earning to cc_salary_log"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#FAA61A,stroke:#C7850F,color:#fff
  style C fill:#FAA61A,stroke:#C7850F,color:#fff
  style D fill:#FAA61A,stroke:#C7850F,color:#fff
  style E fill:#ED4245,stroke:#C73638,color:#fff
  style F fill:#3BA55D,stroke:#2D7D46,color:#fff
  style G fill:#ED4245,stroke:#C73638,color:#fff
  style H fill:#5865F2,stroke:#4752C4,color:#fff
`

const __cc_panel_chart = `
flowchart LR
  A["CC Panel"] --> B["Check Earnings"]
  A --> C["Get Invite Link"]
  A --> D["View Invite Logs"]
  B --> E["Show balance, total earned, stats"]
  C --> F["Create/fetch personal invite URL"]
  D --> G["List recent users joined via CC"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#3BA55D,stroke:#2D7D46,color:#fff
  style C fill:#3BA55D,stroke:#2D7D46,color:#fff
  style D fill:#3BA55D,stroke:#2D7D46,color:#fff
  style E fill:#1a1a2e,stroke:#333,color:#aaa
  style F fill:#1a1a2e,stroke:#333,color:#aaa
  style G fill:#1a1a2e,stroke:#333,color:#aaa
`

const __manager_panel_chart = `
flowchart LR
  A["/cc-salary"] --> B["check — view CC earnings"]
  A --> C["add — manual salary add"]
  A --> D["reset — reset balance to 0"]
  A --> E["withdraw — process withdrawal"]
  A --> F["log — view salary history"]
  A --> G["leaderboard — CC rankings"]

  style A fill:#5865F2,stroke:#4752C4,color:#fff
  style B fill:#3BA55D,stroke:#2D7D46,color:#fff
  style C fill:#FAA61A,stroke:#C7850F,color:#fff
  style D fill:#ED4245,stroke:#C73638,color:#fff
  style E fill:#FAA61A,stroke:#C7850F,color:#fff
  style F fill:#5865F2,stroke:#4752C4,color:#fff
  style G fill:#3BA55D,stroke:#2D7D46,color:#fff
`

// !!! mermaid renderer component !!! \\

function MermaidChart({ chart, id }: { chart: string; id: string }) {
  const container_ref = useRef<HTMLDivElement>(null)
  const [rendered, set_rendered] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function render() {
      const mermaid = (await import("mermaid")).default

      mermaid.initialize({
        startOnLoad : false,
        theme       : "dark",
        themeVariables: {
          primaryColor       : "#5865F2",
          primaryTextColor   : "#ffffff",
          primaryBorderColor : "#4752C4",
          lineColor          : "#555",
          secondaryColor     : "#1a1a2e",
          tertiaryColor      : "#0d0d14",
          background         : "transparent",
          mainBkg            : "#1a1a2e",
          nodeBorder         : "#333",
          clusterBkg         : "#0d0d14",
          fontSize           : "13px",
        },
        flowchart: {
          htmlLabels : true,
          curve      : "basis",
          padding    : 16,
        },
      })

      if (cancelled || !container_ref.current) return

      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart.trim())
        if (!cancelled && container_ref.current) {
          container_ref.current.innerHTML = svg
          set_rendered(true)
        }
      } catch {
        if (!cancelled && container_ref.current) {
          container_ref.current.innerHTML = `<p class="text-red-400 text-sm">Failed to render flowchart</p>`
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart, id])

  return (
    <div className="my-10">
      <div
        ref={container_ref}
        className={cn(
          "w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0c0c0e] p-6 transition-opacity duration-500 flex justify-center",
          rendered ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  )
}

// !!! flowchart section wrapper !!! \\

function FlowSection({ title, chart_id, chart, children }: { title: string; chart_id: string; chart: string; children?: React.ReactNode }) {
  return (
    <div className="mt-12 mb-16">
      <h3 className="text-xl font-semibold text-white/90 mb-4">{title}</h3>
      {children && <div className="text-[#888] leading-relaxed mb-6">{children}</div>}
      <MermaidChart chart={chart} id={chart_id} />
    </div>
  )
}

// !!! main page component !!! \\

export function ContentCreatorFlow() {
  const [scrolled, set_scrolled] = useState(false)

  useEffect(() => {
    const on_scroll = () => set_scrolled(window.scrollY > 12)
    window.addEventListener("scroll", on_scroll, { passive: true })
    return () => window.removeEventListener("scroll", on_scroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#060608] text-white selection:bg-[#5865F2]/30 font-sans pb-24">
      {/* !!! topbar !!! */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled ? "py-2" : "py-4",
        )}
      >
        <div className="max-w-4xl mx-auto px-4">
          <nav
            className={cn(
              "flex items-center justify-between px-4 h-12 rounded-2xl border transition-all duration-300",
              scrolled
                ? "bg-[#0c0c0e]/90 border-white/[0.07] backdrop-blur-xl shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
                : "bg-[#0c0c0e]/70 border-white/[0.06] backdrop-blur-md shadow-[0_2px_16px_rgba(0,0,0,0.3)]",
            )}
          >
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <AtomicLogo className="w-5 h-5 text-white" />
              <span className="text-sm text-white/70 font-medium hidden sm:inline">Atomic Blog</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="text-xs text-[#555] hover:text-white/70 transition-colors px-3 py-1.5"
              >
                Back to Home
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* !!! blog article !!! */}
      <article className="max-w-3xl mx-auto px-6 pt-32 lg:pt-40">
        {/* - blog header - */}
        <header className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5865F2]/20 bg-[#5865F2]/10 px-3 py-1 text-xs font-medium text-[#5865F2]">
              <Sparkles className="w-3.5 h-3.5" />
              System Architecture
            </span>
            <span className="text-[#555] text-xs">Engineering</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.2] text-white/95 mb-6">
            Content Creator Salary System Integration
          </h1>

          <div className="flex items-center gap-6 text-sm text-[#777] border-b border-white/[0.05] pb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center border border-white/[0.1]">
                <AtomicLogo className="w-3 h-3 text-white/80" />
              </div>
              <span>Atomic Eng Team</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>April 2026</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>5 min read</span>
            </div>
          </div>
        </header>

        {/* - blog content (prose-like) - */}
        <div className="prose prose-invert prose-p:text-[#888] prose-p:leading-relaxed prose-headings:text-white/90 prose-a:text-[#5865F2] hover:prose-a:text-[#4752C4] max-w-none">
          <p className="text-lg text-[#aaa]">
            The new Content Creator (CC) salary system introduces an automated pipeline for tracking invites and distributing commissions. CCs receive <strong>Rp 2.500</strong> for every script purchase made by a user who joined through their specific invite link.
          </p>

          <p>
            To achieve this, we integrated invite tracking closely with our existing payment approval workflow. Below, we break down the four main components of the CC Salary architecture.
          </p>

          <FlowSection 
            title="1. Member Invite Tracking" 
            chart_id="invite-tracking" 
            chart={__invite_tracking_chart}
          >
            <p>
              The invite tracking mechanism binds a joined user to the original CC. When a new user enters the server, we resolve the used invite code. If the inviter holds the designated <code>@Content Creator</code> role, we insert a record into the <code>cc_invites</code> database and update their total invite count.
            </p>
          </FlowSection>

          <FlowSection 
            title="2. Payment Commission Flow" 
            chart_id="salary-earning" 
            chart={__salary_earning_chart}
          >
            <p>
              Commission distribution happens transparently during the standard payment approval process. When an administrator approves a purchase via the payment panel, the system reverse-lookups the buyer's <code>user_id</code> in the <code>cc_invites</code> collection. If a match is found and the inviter remains a CC, the commission is appended to their balance and logged securely.
            </p>
          </FlowSection>

          <h2 className="text-2xl font-semibold text-white/90 mt-16 mb-6">User Interfaces & Commands</h2>

          <p>
            Interaction with the system is strictly split between the CC facing panel, for personal analytics and link generation, and the Manager slash commands for administrative oversight.
          </p>

          <FlowSection 
            title="3. CC Panel Interactions" 
            chart_id="cc-panel" 
            chart={__cc_panel_chart}
          >
            <p>
              The CC Panel operates purely on Discord Button Interactions. When a CC clicks "Get Invite Link", the bot automatically generates or retrieves a permanent invite bound to them, simplifying the onboarding process without requiring manual channel configuration.
            </p>
          </FlowSection>

          <FlowSection 
            title="4. Manager Command Routing" 
            chart_id="manager-panel" 
            chart={__manager_panel_chart}
          >
            <p>
              For administrators, the <code>/cc-salary</code> command acts as a gateway for all financial management related to the Content Creator program. It allows checking balances, processing manual additions for off-platform referrals, handling withdrawals, and maintaining the global leaderboard.
            </p>
          </FlowSection>

          <div className="mt-16 pt-8 border-t border-white/[0.05]">
            <h3 className="text-lg font-medium text-white/90 mb-3">Database Implementation Notes</h3>
            <p>
              State is persisted using standard PostgreSQL collections via our internal <code>db</code> utility wrapper. No cache lookups are utilized to prevent inconsistency across gateway restarts. State models (<code>cc_salary_data</code>, <code>cc_salary_log_data</code>, <code>cc_invite_data</code>) dictate the shape.
            </p>
          </div>
        </div>
      </article>
    </div>
  )
}
