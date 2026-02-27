'use client'

import { useState, useRef, useCallback } from 'react'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { cn }       from '@/lib/utils'
import {
  Link2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react'

// - RESULT STATE TYPE - \\
type bypass_state =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; result: string }
  | { status: 'error';   message: string }

export default function BypassPage() {
  const [url, set_url]       = useState('')
  const [state, set_state]   = useState<bypass_state>({ status: 'idle' })
  const [copied, set_copied] = useState(false)
  const input_ref            = useRef<HTMLInputElement>(null)

  const handle_submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmed = url.trim()
    if (!trimmed) {
      input_ref.current?.focus()
      return
    }

    // - BASIC URL FORMAT CHECK CLIENT-SIDE - \\
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

      if (!res.ok || !data.success) {
        set_state({ status: 'error', message: data.error || 'Something went wrong.' })
        return
      }

      set_state({ status: 'success', result: data.result })
    } catch {
      set_state({ status: 'error', message: 'Network error. Please check your connection.' })
    }
  }, [url])

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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">

      {/* - HEADER - \\ */}
      <div className="mb-10 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-card border border-border mb-2">
          <Link2 className="w-5 h-5 text-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Link Bypass</h1>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Bypass shortened or locked links instantly. Your API key stays secure on the server.
        </p>
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
          <ShieldCheck className="w-3 h-3" />
          <span>Server-side only — no credentials exposed</span>
        </div>
      </div>

      {/* - MAIN CARD - \\ */}
      <div className="w-full max-w-lg space-y-4">

        {/* - INPUT FORM - \\ */}
        <form
          onSubmit={handle_submit}
          className="flex gap-2 bg-card border border-border rounded-2xl p-2 focus-within:border-foreground/30 transition-colors"
        >
          <div className="flex-1 flex items-center gap-2 px-2">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={input_ref}
              type="url"
              value={url}
              onChange={e => {
                set_url(e.target.value)
                if (state.status === 'error') set_state({ status: 'idle' })
              }}
              placeholder="https://example.com/shortlink"
              disabled={is_loading}
              autoFocus
              className={cn(
                'flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50',
                'disabled:opacity-50'
              )}
            />
          </div>
          <Button
            type="submit"
            disabled={is_loading || !url.trim()}
            size="sm"
            className="rounded-xl gap-1.5 px-4"
          >
            {is_loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Bypassing</span>
              </>
            ) : (
              <>
                <span>Bypass</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </form>

        {/* - LOADING INDICATOR - \\ */}
        {is_loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground px-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
            <span>Contacting bypass service...</span>
          </div>
        )}

        {/* - SUCCESS RESULT - \\ */}
        {state.status === 'success' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground animate-pulse" />
                Bypassed link
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handle_copy}
                  className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy
                    </>
                  )}
                </Button>
                <a
                  href={state.result}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 h-7 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-foreground break-all font-mono leading-relaxed">
                {state.result}
              </p>
            </div>
            <div className="px-4 pb-3">
              <button
                onClick={handle_reset}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Bypass another link
              </button>
            </div>
          </div>
        )}

        {/* - ERROR STATE - \\ */}
        {state.status === 'error' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 flex items-start gap-3 bg-card border border-border rounded-2xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{state.message}</p>
            </div>
          </div>
        )}

      </div>

      {/* - FOOTER NOTE - \\ */}
      <p className="mt-12 text-xs text-muted-foreground/50 text-center">
        Rate limited to 5 requests per minute per client.
      </p>

    </div>
  )
}
