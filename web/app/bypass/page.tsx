'use client'

import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { Button as StatefulButton } from '@/components/ui/stateful-button'
import { cn }                       from '@/lib/utils'
import { BypassTopbar }  from '@/components/layout/bypass-topbar'
import ShinyText          from '@/components/animations/ShinyText'
import DarkVeil          from '@/components/animations/DarkVeil'
import CountUp            from '@/components/animations/CountUp'
import { FlipWords }      from '@/components/ui/flip-words'
import {
  Link2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'

// - BYPASS STATE TYPE - \\
type bypass_state =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: string; elapsed_ms: number }
  | { status: 'error';   message: string }

export default function BypassPage() {
  const [url, set_url]             = useState('')
  const [state, set_state]         = useState<bypass_state>({ status: 'idle' })
  const [copied, set_copied]       = useState(false)
  const [bypass_count, set_bypass_count]       = useState<number>(0)
  const [supported_count, set_supported_count] = useState<number>(0)
  const input_ref                  = useRef<HTMLInputElement>(null)
  const submitted_url              = useRef<string>('')

  // - FETCH REAL BYPASS COUNT FROM DB - \\
  const refresh_bypass_count = useCallback(() => {
    fetch('/api/bypass-stats')
      .then(r => r.json())
      .then(d => { if (typeof d.count === 'number') set_bypass_count(d.count) })
      .catch(() => {})
  }, [])

  // - FETCH STATS AND POLL EVERY 30S - \\
  useEffect(() => {
    refresh_bypass_count()
    fetch('/api/supported')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) set_supported_count(d.length) })
      .catch(() => {})

    const interval = setInterval(refresh_bypass_count, 30_000)
    return () => clearInterval(interval)
  }, [refresh_bypass_count])

  // - CORE BYPASS LOGIC, RETURNS PROMISE FOR STATEFUL BUTTON - \\
  const run_bypass = useCallback(async (): Promise<void> => {
    const trimmed = url.trim()
    if (!trimmed) {
      input_ref.current?.focus()
      return
    }

    try {
      new URL(trimmed)
    } catch {
      set_state({ status: 'error', message: 'Please enter a valid URL (e.g. https://example.com/...)' })
      return
    }

    set_state({ status: 'loading' })

    try {
      const res = await fetch('/api/bypass', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ url: trimmed }),
      })

      const data = await res.json().catch(() => ({ error: 'Unexpected response from server.' }))

      set_bypass_count(c => c + 1)  // - COUNT EVERY ATTEMPT - \\
      refresh_bypass_count()          // - SYNC REAL VALUE FROM DB - \\

      if (!res.ok || !data.success) {
        set_state({ status: 'error', message: data.error || 'Something went wrong.' })
        return
      }

      submitted_url.current = trimmed
      set_state({ status: 'success', result: data.result, elapsed_ms: data.elapsed_ms ?? 0 })
    } catch {
      set_state({ status: 'error', message: 'Network error. Please check your connection.' })
    }
  }, [url, refresh_bypass_count])

  const handle_submit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    run_bypass()
  }, [run_bypass])

  const handle_copy = useCallback(async () => {
    if (state.status !== 'success') return
    await navigator.clipboard.writeText(state.result).catch(() => null)
    set_copied(true)
    setTimeout(() => set_copied(false), 2000)
  }, [state])

  const handle_reset = useCallback(() => {
    set_url('')
    set_state({ status: 'idle' })
    setTimeout(() => input_ref.current?.focus(), 50)
  }, [])

  const is_loading = state.status === 'loading'
  const is_done    = state.status === 'success' || state.status === 'error'

  return (
    <div className="min-h-screen relative">
      {/* - DARKVEIL BACKGROUND - \ */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <DarkVeil
          hueShift={0}
          noiseIntensity={0}
          scanlineIntensity={0}
          speed={0.9}
          scanlineFrequency={0}
          warpAmount={0}
        />
      </div>

      <BypassTopbar />

      {/* - PAGE CONTENT - \\ */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-20">
        <div className="w-full max-w-xl space-y-8">

          {/* - HEADING - \\ */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
              <img src="/atomc.svg" alt="Atomic" className="w-9 h-9 shrink-0" />
              Link Bypass
            </h1>
            <div className="text-muted-foreground text-base font-normal">
              Bypass
              <FlipWords words={['Platoboost', 'Linkvertise', 'Hydrogen', 'Pandadevelopment', 'Lockrso']} className="text-foreground font-semibold" />
              with Atomic Bypasser
            </div>
          </div>

          {/* - INPUT FORM - \\ */}
          <form
            onSubmit={handle_submit}
            className={cn(
              'flex items-center gap-2 bg-card border rounded-2xl p-2 transition-colors',
              state.status === 'error'
                ? 'border-border/80'
                : 'border-border focus-within:border-foreground/25'
            )}
          >
            <div className="flex-1 flex items-center gap-2.5 px-2">
              <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={input_ref}
                type="url"
                value={url}
                onChange={e => {
                  set_url(e.target.value)
                  if (state.status === 'error') set_state({ status: 'idle' })
                }}
                placeholder="https://linkvertise.com/..."
                disabled={is_loading}
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 disabled:opacity-50 min-w-0"
              />
            </div>
            <StatefulButton
              type="button"
              disabled={!url.trim() || is_done}
              onClick={run_bypass}
              className="rounded-xl px-5 shrink-0 min-w-fit text-sm font-medium"
            >
              Bypass
            </StatefulButton>
          </form>

          {/* - ERROR - \\ */}
          {state.status === 'error' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-200 flex items-start gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm">{state.message}</p>
            </div>
          )}

          {/* - LOADING - \\ */}
          {is_loading && (
            <div className="animate-in fade-in duration-200 px-1">
              <ShinyText
                text="Contacting bypass service..."
                speed={2}
                delay={0}
                color="#6b7280"
                shineColor="#e5e7eb"
                spread={120}
                direction="left"
                className="text-sm"
              />
            </div>
          )}

          {/* - SUCCESS - \\ */}
          {state.status === 'success' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl border border-border bg-card overflow-hidden">

              {/* - RESULT HEADER - \\ */}
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-foreground" />
                  Direct link
                </div>
                <div className="flex items-center gap-2.5">
                  {state.elapsed_ms > 0 && (
                    <span className="text-xs text-muted-foreground/60 tabular-nums">
                      {(state.elapsed_ms / 1000).toFixed(2)}s
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                  <button
                    onClick={handle_copy}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <a
                    href={submitted_url.current || '#'}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                  </div>
                </div>
              </div>

              {/* - RESULT URL - \\ */}
              <div className="px-4 py-4">
                <p className="text-sm font-mono break-all leading-relaxed text-foreground">
                  {state.result}
                </p>
              </div>

              {/* - RESET - \\ */}
              <div className="px-4 pb-4">
                <button
                  onClick={handle_reset}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Bypass another link
                </button>
              </div>

            </div>
          )}

          {/* - HINT FOOTER - \\ */}
          {state.status === 'idle' && (
            <p className="text-center text-xs text-muted-foreground/40">
              5 requests per minute per client
            </p>
          )}
          {/* - STATS CARDS - \ */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white rounded-3xl overflow-hidden px-5 py-4 flex items-center justify-between border border-border">
              <StatsGrid size={20} />
              <div className="relative z-20">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Links Bypassed</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  <CountUp
                    from={0}
                    to={bypass_count}
                    separator=","
                    direction="up"
                    duration={1}
                    startWhen={bypass_count > 0}
                  />
                </p>
              </div>
              <div className="relative z-20 text-muted-foreground/40">
                <svg width="32" height="32" viewBox="0 0 251 202" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M130.598 118.252L69.9985 195.951C67.2675 199.453 63.0748 201.5 58.6341 201.5H7.5C3.63401 201.5 0.5 198.366 0.5 194.5V141.21C0.5 136.638 2.0667 132.203 4.93908 128.646L103.903 6.0769C106.751 2.54996 111.041 0.5 115.574 0.5H167.645C171.511 0.5 174.645 3.63401 174.645 7.5V90.7925C174.645 94.6585 177.779 97.7925 181.645 97.7925H245.5C248.261 97.7925 250.5 100.031 250.5 102.793V199.777C250.5 200.729 249.729 201.5 248.777 201.5H189.161C168.163 201.5 151.141 184.478 151.141 163.48V125.316C151.141 118.972 145.999 113.83 139.655 113.83C136.116 113.83 132.775 115.461 130.598 118.252Z" fill="currentColor"/>
                </svg>
              </div>
            </div>
            <div className="relative bg-gradient-to-b dark:from-neutral-900 from-neutral-100 dark:to-neutral-950 to-white rounded-3xl overflow-hidden px-5 py-4 flex items-center justify-between border border-border">
              <StatsGrid size={20} />
              <div className="relative z-20">
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Supported Services</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">
                  {supported_count > 0 ? supported_count.toLocaleString() : '—'}
                </p>
              </div>
              <div className="relative z-20 text-muted-foreground/40">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// - GRID BACKGROUND FOR STATS CARD - \\
function StatsGrid({ size = 20 }: { size?: number }) {
  const p: number[][] = [
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
    [Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
  ]
  return (
    <div className="pointer-events-none absolute left-1/2 top-0 -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 from-zinc-100/30 to-zinc-300/30 dark:to-zinc-900/30 opacity-100">
        <StatsGridPattern
          width={size}
          height={size}
          x="-12"
          y="4"
          squares={p}
          className="absolute inset-0 h-full w-full mix-blend-overlay dark:fill-white/10 dark:stroke-white/10 stroke-black/10 fill-black/10"
        />
      </div>
    </div>
  )
}

function StatsGridPattern({ width, height, x, y, squares, ...props }: any) {
  const pattern_id = useId()
  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern id={pattern_id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M.5 ${height}V.5H${width}`} fill="none" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${pattern_id})`} />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([sx, sy]: number[]) => (
            <rect strokeWidth="0" key={`${sx}-${sy}`} width={width + 1} height={height + 1} x={sx * width} y={sy * height} />
          ))}
        </svg>
      )}
    </svg>
  )
}
