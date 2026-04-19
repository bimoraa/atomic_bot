'use client'

import { useRef, useEffect, useState, useCallback }                   from 'react'
import { motion, AnimatePresence, useMotionValue, useAnimationFrame } from 'motion/react'
import { GeistSans }                                                     from 'geist/font/sans'
import {
  Dialog, DialogClose, DialogContent,
  DialogDescription, DialogFooter, DialogHeader,
  DialogOverlay, DialogPortal, DialogTitle,
} from '@/components/animate-ui/primitives/radix/dialog'
import { X }                                                             from 'lucide-react'
import { LinkPreview }                                                   from '@/components/ui/link-preview'
import {
  Ticket, Key, Bell, BillCheck, ShieldCheck, ChatRoundDots,
  Bolt, Earth, Chart, Lock, Monitor, Code,
  BellBing, UsersGroupRounded, PlayCircle, Stream, Settings,
  Muted, UserBlock, ClipboardList, UserCross, CalendarMark,
  DangerTriangle, ChatRoundCheck, Database,
  Layers, ServerMinimalistic, LinkMinimalistic,
  DocumentText, Cpu,
} from '@solar-icons/react'

// - continuously orbiting glow blob, driven by sin/cos — zero keyframe jank - \\
function FloatingBlob({
  color, size, rx, ry, speed, phase,
}: {
  color : string
  size  : number
  rx    : number
  ry    : number
  speed : number
  phase : number
}) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  useAnimationFrame((t) => {
    const angle = (t / 1000) * speed + phase
    x.set(Math.cos(angle) * rx)
    y.set(Math.sin(angle) * ry)
  })

  return (
    <motion.div
      style={{
        x,
        y,
        position   : 'absolute',
        width      : size,
        height     : size,
        borderRadius: '50%',
        background : `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        filter     : 'blur(22px)',
        top        : '50%',
        left       : '50%',
        marginTop  : -(size / 2),
        marginLeft : -(size / 2),
        willChange : 'transform',
        pointerEvents: 'none',
      }}
    />
  )
}

// - section dot nav index - \\
const __sections = ['hero', 'atomic', 'bypass', 'jkt48', 'moderation', 'web', 'stack', 'cta', 'credit'] as const
type Section = typeof __sections[number]

// - github svg icon - \\
function GithubIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

// - discord svg icon (official brand path) - \\
function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.775} viewBox="0 0 71 55" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M60.105 4.898A58.55 58.55 0 0 0 45.653.415a.22.22 0 0 0-.232.11 40.784 40.784 0 0 0-1.8 3.697 54.078 54.078 0 0 0-16.232 0 37.38 37.38 0 0 0-1.827-3.697.228.228 0 0 0-.233-.11 58.386 58.386 0 0 0-14.451 4.483.207.207 0 0 0-.095.082C1.578 18.73-.944 32.144.293 45.39a.244.244 0 0 0 .093.167c6.073 4.46 11.955 7.167 17.729 8.962a.23.23 0 0 0 .249-.082 42.08 42.08 0 0 0 3.627-5.9.225.225 0 0 0-.123-.312 38.772 38.772 0 0 1-5.539-2.64.228.228 0 0 1-.022-.378 31.17 31.17 0 0 0 1.1-.862.22.22 0 0 1 .23-.031c11.619 5.304 24.198 5.304 35.68 0a.219.219 0 0 1 .232.028c.356.293.728.586 1.103.865a.228.228 0 0 1-.02.378 36.384 36.384 0 0 1-5.54 2.637.227.227 0 0 0-.121.315 47.249 47.249 0 0 0 3.624 5.897.225.225 0 0 0 .249.084c5.801-1.794 11.684-4.502 17.757-8.961a.228.228 0 0 0 .092-.164c1.48-15.315-2.48-28.618-10.497-40.412a.18.18 0 0 0-.093-.084zm-36.38 32.427c-3.497 0-6.38-3.211-6.38-7.156s2.827-7.156 6.38-7.156c3.583 0 6.438 3.24 6.38 7.156 0 3.945-2.827 7.156-6.38 7.156zm23.593 0c-3.498 0-6.38-3.211-6.38-7.156s2.826-7.156 6.38-7.156c3.582 0 6.437 3.24 6.38 7.156 0 3.945-2.798 7.156-6.38 7.156z"/>
    </svg>
  )
}

// - reusable feature card with equal height - \\
function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 flex flex-col gap-2 hover:border-white/[0.12] transition-colors duration-300">
      <span className="text-[#666]"><SolarIcon icon={Icon} size={16} iconStyle="LineDuotone" /></span>
      <span className="text-[0.8rem] text-white/85 font-normal leading-snug">{title}</span>
      <span className="text-[0.72rem] text-[#4a4a4a] leading-relaxed flex-1">{desc}</span>
    </div>
  )
}

// - tech pill - \\
function Pill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-0.5 text-[0.68rem] text-[#555]">
      {label}
    </span>
  )
}

// - solar icon wrapper — fixes iconStyle type error on direct usages - \\
function SolarIcon({ icon: I, size, iconStyle = 'LineDuotone', className }: { icon: React.ElementType; size?: number; iconStyle?: string; className?: string }) {
  const C = I as React.ComponentType<{ size?: number; iconStyle?: string; className?: string }>
  return <C size={size} iconStyle={iconStyle} className={className} />
}

// - stat block - \\
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[1.3rem] font-normal text-white" style={{ letterSpacing: '-0.03em' }}>{value}</span>
      <span className="text-[0.68rem] text-[#444]">{label}</span>
    </div>
  )
}

// - web page entry card — title uses LinkPreview hover screenshot - \\
function WebPageEntry({
  full_url,
  path,
  title,
  desc,
  icon : Icon,
  badge,
}: {
  full_url: string
  path    : string
  title   : string
  desc    : string
  icon    : React.ElementType
  badge   : string
}) {
  return (
    <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.10] transition-colors duration-300">
      {/* - browser chrome - \\ */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.04] bg-white/[0.01]">
        <span className="w-1.5 h-1.5 rounded-full bg-white/[0.07]" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/[0.07]" />
        <span className="w-1.5 h-1.5 rounded-full bg-white/[0.07]" />
        <span className="ml-2 flex-1 truncate text-[0.58rem] text-[#2a2a2a] font-mono tracking-tight">
          azure48.xyz{path}
        </span>
      </div>
      {/* - card body - \\ */}
      <div className="p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[#3d3d3d]"><SolarIcon icon={Icon} size={12} iconStyle="LineDuotone" /></span>
            <LinkPreview
              url={full_url}
              width={240}
              height={150}
              className="text-[0.78rem] text-white/70 hover:text-white/90 transition-colors font-normal"
            >
              {title}
            </LinkPreview>
          </div>
          <span className="shrink-0 text-[0.55rem] text-[#2e2e2e] px-1.5 py-0.5 rounded-full border border-white/[0.04]">
            {badge}
          </span>
        </div>
        <p className="text-[0.67rem] text-[#3a3a3a] leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

// - animated section wrapper - \\
// - content area scrollable on mobile so long sections don't force premature nav - \\
function Slide({
  id,
  active,
  children,
  direction,
  scrollable = false,
}: {
  id         : string
  active     : boolean
  children   : React.ReactNode
  direction  : 'up' | 'down'
  scrollable?: boolean
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {active && (
        <motion.div
          key={id}
          initial={{ opacity: 0, y: direction === 'down' ? 60 : -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: direction === 'down' ? -60 : 60 }}
          transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          {scrollable ? (
            <div
              data-scroller
              className="w-full h-full overflow-y-auto overscroll-contain flex items-start py-16 sm:py-0 sm:items-center"
            >
              {children}
            </div>
          ) : (
            <div className="w-full h-full flex items-center">
              {children}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// - welcome intro overlay — plays once on first mount - \\
// - atomic logo svg (static) - \\
function AtomicLogo({ size = 72 }: { size?: number }) {
  const ratio = 202 / 251
  return (
    <svg
      width={size}
      height={size * ratio}
      viewBox="0 0 251 202"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M130.598 118.252L69.9985 195.951C67.2675 199.453 63.0748 201.5 58.6341 201.5H7.5C3.63401 201.5 0.5 198.366 0.5 194.5V141.21C0.5 136.638 2.0667 132.203 4.93908 128.646L103.903 6.0769C106.751 2.54996 111.041 0.5 115.574 0.5H167.645C171.511 0.5 174.645 3.63401 174.645 7.5V90.7925C174.645 94.6585 177.779 97.7925 181.645 97.7925H245.5C248.261 97.7925 250.5 100.031 250.5 102.793V199.777C250.5 200.729 249.729 201.5 248.777 201.5H189.161C168.163 201.5 151.141 184.478 151.141 163.48V125.316C151.141 118.972 145.999 113.83 139.655 113.83C136.116 113.83 132.775 115.461 130.598 118.252Z" fill="#ffffff" />
      <path d="M167.646 0.25C171.649 0.250115 174.896 3.49601 174.896 7.5V90.793C174.896 94.5207 177.918 97.543 181.646 97.543H245.5C248.4 97.543 250.75 99.8935 250.75 102.793V199.777C250.75 200.867 249.867 201.75 248.777 201.75H189.161C168.025 201.75 150.891 184.616 150.891 163.479V125.315C150.89 119.11 145.861 114.08 139.655 114.08C136.193 114.08 132.924 115.675 130.795 118.405L70.1953 196.105C67.4169 199.668 63.1513 201.75 58.6338 201.75H7.5C3.49594 201.75 0.25 198.504 0.25 194.5V141.21C0.25 136.58 1.83586 132.09 4.74414 128.488L103.709 5.91992C106.604 2.33429 110.966 0.25 115.574 0.25H167.646Z" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.5" />
    </svg>
  )
}

// - animated atomic logo: stroke draws in, fill blossoms after - \\
function AnimatedAtomicLogo({ size = 88 }: { size?: number }) {
  const ratio = 202 / 251
  return (
    <svg
      width={size}
      height={size * ratio}
      viewBox="0 0 251 202"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* - outline traces the shape first - \\ */}
      <motion.path
        d="M167.646 0.25C171.649 0.250115 174.896 3.49601 174.896 7.5V90.793C174.896 94.5207 177.918 97.543 181.646 97.543H245.5C248.4 97.543 250.75 99.8935 250.75 102.793V199.777C250.75 200.867 249.867 201.75 248.777 201.75H189.161C168.025 201.75 150.891 184.616 150.891 163.479V125.315C150.89 119.11 145.861 114.08 139.655 114.08C136.193 114.08 132.924 115.675 130.795 118.405L70.1953 196.105C67.4169 199.668 63.1513 201.75 58.6338 201.75H7.5C3.49594 201.75 0.25 198.504 0.25 194.5V141.21C0.25 136.58 1.83586 132.09 4.74414 128.488L103.709 5.91992C106.604 2.33429 110.966 0.25 115.574 0.25H167.646Z"
        stroke="#ffffff"
        strokeWidth="1.5"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
        transition={{
          pathLength : { duration: 1.4, ease: 'easeInOut' },
          opacity    : { duration: 1.8, times: [0, 0.06, 0.72, 1] },
        }}
      />
      {/* - fill appears after stroke finishes drawing - \\ */}
      <motion.path
        d="M130.598 118.252L69.9985 195.951C67.2675 199.453 63.0748 201.5 58.6341 201.5H7.5C3.63401 201.5 0.5 198.366 0.5 194.5V141.21C0.5 136.638 2.0667 132.203 4.93908 128.646L103.903 6.0769C106.751 2.54996 111.041 0.5 115.574 0.5H167.645C171.511 0.5 174.645 3.63401 174.645 7.5V90.7925C174.645 94.6585 177.779 97.7925 181.645 97.7925H245.5C248.261 97.7925 250.5 100.031 250.5 102.793V199.777C250.5 200.729 249.729 201.5 248.777 201.5H189.161C168.163 201.5 151.141 184.478 151.141 163.48V125.316C151.141 118.972 145.999 113.83 139.655 113.83C136.116 113.83 132.775 115.461 130.598 118.252Z"
        fill="#ffffff"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      />
    </svg>
  )
}

// - welcome blob: fully imperative — single useAnimationFrame drives opacity + orbit - \\
// - no declarative animate props = zero conflict, zero jitter - \\
function WelcomeBlob({
  color, size, rx, ry, speed, phase, fade_delay = 0, ox = 0, oy = 0,
}: {
  color      : string
  size       : number
  rx         : number
  ry         : number
  speed      : number
  phase      : number
  fade_delay?: number
  ox?        : number
  oy?        : number
}) {
  const x       = useMotionValue(ox)
  const y       = useMotionValue(oy)
  const opacity = useMotionValue(0)

  useAnimationFrame((t) => {
    const secs    = t / 1000
    const elapsed = Math.max(0, secs - fade_delay)

    // - smooth linear fade over 0.8s after delay - \\
    opacity.set(Math.min(1, elapsed / 0.8))

    // - continuous elliptical orbit using absolute clock - \\
    x.set(ox + Math.cos(secs * speed + phase) * rx)
    y.set(oy + Math.sin(secs * speed + phase) * ry)
  })

  return (
    <motion.div
      style={{
        x, y, opacity,
        position          : 'absolute',
        width             : size,
        height            : size,
        borderRadius      : '50%',
        background        : `radial-gradient(circle, ${color} 0%, transparent 65%)`,
        filter            : 'blur(28px)',
        top               : '50%',
        left              : '50%',
        marginTop         : -(size / 2),
        marginLeft        : -(size / 2),
        willChange        : 'transform, opacity',
        pointerEvents     : 'none',
        backfaceVisibility: 'hidden',
      }}
    />
  )
}

function WelcomeAnimation({ on_done, sfx_ref }: { on_done: () => void; sfx_ref: React.RefObject<HTMLAudioElement | null> }) {
  useEffect(() => {
    const t = setTimeout(on_done, 3000)
    return () => clearTimeout(t)
  }, [on_done])

  // - play the preloaded sfx — already buffered by LandingPage on mount - \\
  useEffect(() => {
    const sfx = sfx_ref.current
    if (!sfx) return
    sfx.currentTime = 0
    sfx.play().catch(() => {})
    return () => { sfx.pause(); sfx.currentTime = 0 }
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a] overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >

      {/* - welcome blobs: continuous sin/cos orbit, staggered fade-in - \\ */}
      <WelcomeBlob color="rgba(115,0,255,0.32)"  size={480} rx={28} ry={20} speed={0.9}  phase={0}   fade_delay={0}   ox={0}   oy={0}   />
      <WelcomeBlob color="rgba(0,183,255,0.22)"   size={360} rx={24} ry={30} speed={-1.3} phase={1.2} fade_delay={0.4} ox={-55} oy={-35} />
      <WelcomeBlob color="rgba(255,0,64,0.18)"    size={320} rx={20} ry={24} speed={1.7}  phase={2.4} fade_delay={0.8} ox={45}  oy={50}  />
      <WelcomeBlob color="rgba(0,229,183,0.18)"   size={280} rx={26} ry={18} speed={-1.1} phase={0.8} fade_delay={1.2} ox={60}  oy={-45} />
      <WelcomeBlob color="rgba(228,120,255,0.17)" size={240} rx={18} ry={26} speed={2.0}  phase={3.6} fade_delay={1.6} ox={-48} oy={42}  />

      {/* - icon build animation - \\ */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, filter: 'blur(0px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 2.8, filter: 'blur(24px)', transition: { duration: 0.6, ease: [0.2, 0, 0.8, 1] } }}
        transition={{ duration: 0.25 }}
        style={{ filter: 'drop-shadow(0 0 28px rgba(115, 0, 255, 0.6)) drop-shadow(0 0 56px rgba(115, 0, 255, 0.2))' }}
      >
        <AnimatedAtomicLogo size={96} />
      </motion.div>

    </motion.div>
  )
}

// - main landing page - \\
export function LandingPage() {
  const [current, set_current]         = useState(0)
  const [discord_dialog, set_discord]  = useState(false)
  const [direction, set_direction]     = useState<'down' | 'up'>('down')
  const [locked, set_locked]           = useState(false)
  const [intro_done, set_intro_done]   = useState(false)
  const [touched,       set_touched]       = useState(false)
  const [gate_exiting,  set_gate_exiting]  = useState(false)
  const [card_hovered,  set_card_hovered]  = useState(false)
  const touch_start                    = useRef<number>(0)
  const container_ref                  = useRef<HTMLDivElement>(null)
  const sfx_ref                        = useRef<HTMLAudioElement | null>(null)

  // - preload sfx while touch gate is visible so it plays instantly on welcome - \\
  useEffect(() => {
    const sfx   = new Audio('/startup-sfx-atmc.mp3')
    sfx.volume  = 1
    sfx.preload = 'auto'
    sfx.load()
    sfx_ref.current = sfx
    return () => { sfx.pause(); sfx.src = '' }
  }, [])

  // - navigate to a section - \\
  const go_to = useCallback((idx: number) => {
    if (locked) return
    if (idx < 0 || idx >= __sections.length) return
    set_direction(idx > current ? 'down' : 'up')
    set_current(idx)
    set_locked(true)
    setTimeout(() => set_locked(false), 750)
  }, [current, locked])

  // - get inner scroller of active slide - \\
  const get_scroller = useCallback((): HTMLElement | null => {
    return container_ref.current?.querySelector('[data-scroller]') as HTMLElement | null
  }, [])

  // - wheel: respect inner scroll before changing section - \\
  useEffect(() => {
    const on_wheel = (e: WheelEvent) => {
      const scroller = get_scroller()
      if (scroller) {
        const at_top    = scroller.scrollTop <= 0
        const at_bottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
        if (e.deltaY > 0 && !at_bottom) return
        if (e.deltaY < 0 && !at_top) return
      }
      e.preventDefault()
      if (Math.abs(e.deltaY) < 20) return
      go_to(e.deltaY > 0 ? current + 1 : current - 1)
    }
    window.addEventListener('wheel', on_wheel, { passive: false })
    return () => window.removeEventListener('wheel', on_wheel)
  }, [current, go_to, get_scroller])

  // - touch: respect inner scroll position on mobile - \\
  useEffect(() => {
    const on_start = (e: TouchEvent) => { touch_start.current = e.touches[0].clientY }
    const on_end   = (e: TouchEvent) => {
      const delta    = touch_start.current - e.changedTouches[0].clientY
      if (Math.abs(delta) < 50) return
      const scroller = get_scroller()
      if (scroller) {
        const at_top    = scroller.scrollTop <= 0
        const at_bottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
        if (delta > 0 && !at_bottom) return
        if (delta < 0 && !at_top) return
      }
      go_to(delta > 0 ? current + 1 : current - 1)
    }
    window.addEventListener('touchstart', on_start, { passive: true })
    window.addEventListener('touchend',   on_end,   { passive: true })
    return () => {
      window.removeEventListener('touchstart', on_start)
      window.removeEventListener('touchend', on_end)
    }
  }, [current, go_to, get_scroller])

  // - keyboard navigation - \\
  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') go_to(current + 1)
      if (e.key === 'ArrowUp'   || e.key === 'PageUp')   go_to(current - 1)
    }
    window.addEventListener('keydown', on_key)
    return () => window.removeEventListener('keydown', on_key)
  }, [current, go_to])

  const section_name = __sections[current]

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden bg-[#0a0a0a] text-white ${GeistSans.className}`}
      style={{ letterSpacing: '-0.02em' }}
    >

      {/* - touch gate: shown before welcome, ensures user gesture for audio - \\ */}
      <AnimatePresence>
        {!touched && (
          <motion.div
            key="touch-gate"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0a0a0a]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
          >
            {/* - animated gradient shimmer on text - \\ */}
            <style>{`
              @keyframes __shimmer_sweep {
                0%   { background-position: 200% center }
                100% { background-position: -200% center }
              }
              .touch-gate-label {
                background          : linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.85) 35%, rgba(255,255,255,0.85) 55%, rgba(255,255,255,0.18) 100%);
                background-size     : 300% auto;
                -webkit-background-clip: text;
                background-clip     : text;
                -webkit-text-fill-color: transparent;
                animation           : __shimmer_sweep 3.5s linear infinite;
              }
            `}</style>
            <motion.button
              onClick={() => { if (!gate_exiting) set_gate_exiting(true) }}
              className="relative px-8 py-4 text-base font-medium select-none cursor-pointer"
              initial={{ opacity: 0, y: 8, scale: 1, filter: 'blur(0px)' }}
              animate={gate_exiting
                ? { opacity: 0, scale: 1.7, filter: 'blur(16px)', y: 0 }
                : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
              }
              transition={gate_exiting
                ? { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
                : { delay: 0.3, duration: 0.6, ease: 'easeOut' }
              }
              onAnimationComplete={() => { if (gate_exiting) set_touched(true) }}
              style={{ letterSpacing: '-0.02em' }}
            >
              <span className="touch-gate-label">touch me gng</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* - welcome intro overlay - \\ */}
      <AnimatePresence>
        {touched && !intro_done && <WelcomeAnimation on_done={() => set_intro_done(true)} sfx_ref={sfx_ref} />}
      </AnimatePresence>

      {/* - ambient glow blobs, per-section - \\ */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* atomic — #7300FF top-right */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'atomic' ? 0.18 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 700,
            height    : 700,
            background: 'radial-gradient(circle, #7300FF 0%, transparent 65%)',
            filter    : 'blur(80px)',
            top       : '-15%',
            right     : '-10%',
          }}
        />

        {/* bypass — #FF0040 bottom-left */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'bypass' ? 0.16 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 650,
            height    : 650,
            background: 'radial-gradient(circle, #FF0040 0%, transparent 65%)',
            filter    : 'blur(80px)',
            bottom    : '-20%',
            left      : '10%',
          }}
        />

        {/* jkt48 — #E478FF bottom-center */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'jkt48' ? 0.18 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 600,
            height    : 600,
            background: 'radial-gradient(circle, #E478FF 0%, transparent 65%)',
            filter    : 'blur(90px)',
            bottom    : '-30%',
            left      : '50%',
            transform : 'translateX(-50%)',
          }}
        />

        {/* hero / cta — #00B7FF top-right */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: (section_name === 'hero' || section_name === 'cta') ? 0.14 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 650,
            height    : 650,
            background: 'radial-gradient(circle, #00B7FF 0%, transparent 65%)',
            filter    : 'blur(80px)',
            top       : '-20%',
            left      : '55%',
          }}
        />

        {/* hero / cta — #00B7FF bottom-center soft */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: (section_name === 'hero' || section_name === 'cta') ? 0.09 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 600,
            height    : 600,
            background: 'radial-gradient(circle, #00B7FF 0%, transparent 65%)',
            filter    : 'blur(80px)',
            bottom    : '-28%',
            left      : '50%',
            transform : 'translateX(-50%)',
          }}
        />

        {/* moderation — #FF6B00 top-left */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'moderation' ? 0.15 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 620,
            height    : 620,
            background: 'radial-gradient(circle, #FF6B00 0%, transparent 65%)',
            filter    : 'blur(85px)',
            top       : '-10%',
            left      : '-5%',
          }}
        />

        {/* web — #00E5B7 right-center */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'web' ? 0.13 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 660,
            height    : 660,
            background: 'radial-gradient(circle, #00E5B7 0%, transparent 65%)',
            filter    : 'blur(85px)',
            top       : '5%',
            right     : '-18%',
          }}
        />

        {/* stack — #3B82F6 bottom-right */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'stack' ? 0.14 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 600,
            height    : 600,
            background: 'radial-gradient(circle, #3B82F6 0%, transparent 65%)',
            filter    : 'blur(80px)',
            bottom    : '-15%',
            right     : '5%',
          }}
        />

        {/* credit — #FFFFFF soft top-left */}
        <motion.div
          className="absolute rounded-full"
          animate={{ opacity: section_name === 'credit' ? 0.06 : 0 }}
          transition={{ duration: 1.6, ease: [0.4, 0, 0.2, 1] }}
          style={{
            width     : 500,
            height    : 500,
            background: 'radial-gradient(circle, #FFFFFF 0%, transparent 65%)',
            filter    : 'blur(100px)',
            top       : '-10%',
            left      : '-5%',
          }}
        />

      </div>

      {/* - dot nav (right side) - \\ */}
      <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
        {__sections.map((s, i) => (
          <button
            key={s}
            onClick={() => go_to(i)}
            title={s}
            className="group flex items-center justify-end"
          >
            <span
              className={`block rounded-full transition-all duration-300 ${
                i === current
                  ? 'w-2 h-2 bg-white'
                  : 'w-1.5 h-1.5 bg-[#444] group-hover:bg-[#777]'
              }`}
            />
          </button>
        ))}
      </nav>

      {/* - section container - \\ */}
      <div ref={container_ref} className="relative w-full h-full">

        {/* ─── 0 · HERO ─────────────────────────────────────── */}
        <Slide id="hero" active={section_name === 'hero'} direction={direction}>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="max-w-xl">

              <motion.h1
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
                className="text-[2.4rem] sm:text-[3.6rem] font-normal text-white leading-[1.08] mb-5"
                style={{ letterSpacing: '-0.03em' }}
              >
                just messing around.<br />
                <span className="text-[#444]">somehow it turned into all this.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, duration: 0.5 }}
                className="text-[#555] text-[0.88rem] leading-relaxed mb-8 max-w-sm"
              >
                started off just tryna learn TypeScript. ended up with three Discord bots, a whole web dashboard, and a Postgres backend.
                ion even know how it got this far but here we are.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.45 }}
                className="flex flex-wrap items-center gap-3 mb-7"
              >
                <button
                  onClick={() => set_discord(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] hover:bg-[#4752c4] transition-colors duration-200 px-4 py-2"
                >
                  <DiscordIcon size={14} />
                  <span className="text-white text-[0.82rem]">Join Discord</span>
                </button>
                <a
                  href="https://github.com/bimoraa/atomic_bot"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-200 px-4 py-2"
                >
                  <GithubIcon size={14} className="text-[#666]" />
                  <span className="text-[#666] text-[0.82rem]">view source</span>
                </a>
                <button
                  onClick={() => go_to(1)}
                  className="text-[0.8rem] text-[#3a3a3a] hover:text-[#777] transition-colors flex items-center gap-1.5"
                >
                  see the projects
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                  </svg>
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.42 }}
                className="flex flex-wrap gap-1.5 mb-4"
              >
                {['TypeScript', 'Node.js', 'discord.js v14', 'PostgreSQL', 'Next.js 15', 'Railway'].map(t => (
                  <Pill key={t} label={t} />
                ))}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-[#2e2e2e] text-[0.7rem]"
              >
                <a href="/terms-of-service" className="hover:text-[#555] underline underline-offset-2 transition-colors">terms of service</a>
                {' · '}
                <a href="/privacy-policy" className="hover:text-[#555] underline underline-offset-2 transition-colors">privacy policy</a>
                {' · '}
                <a href="/license" className="hover:text-[#555] underline underline-offset-2 transition-colors">license</a>
              </motion.p>
            </div>
          </div>
        </Slide>

        {/* ─── 1 · ATOMIC BOT ────────────────────────────────── */}
        <Slide id="atomic" active={section_name === 'atomic'} direction={direction} scrollable>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="mb-6">
              <h2
                className="text-[1.7rem] sm:text-[2.3rem] font-normal text-white mb-2.5 leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                Atomic Bot
              </h2>
              <p className="text-[#4a4a4a] text-[0.82rem] max-w-lg leading-relaxed mb-4">
                was not bout to pay $10/mo for a ticket bot so I built one. ended up with ticket system,
                key management, reminders, and a whole payment flow. cache fully disabled, everything hits REST.
                went a lil overboard but it is what it is.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['TypeScript', 'discord.js v14', 'PostgreSQL', 'Express', 'Railway'].map(t => <Pill key={t} label={t} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
              {[
                { icon: Ticket,             title: 'Ticket System',    desc: 'was not paying for a ticket bot. built it myself.' },
                { icon: Key,                title: 'Key Management',   desc: 'issue, revoke, check license keys. all stored in Postgres.' },
                { icon: Bell,               title: 'Reminders',        desc: 'cron-based reminders that keep running even after restarts.' },
                { icon: BillCheck,          title: 'Payment Flow',     desc: 'auto-assigns buyer role once payment confirmed.' },
                { icon: ShieldCheck,        title: 'Auto Moderation',  desc: 'quarantine, mute, warn, ban. everything logged to DB.' },
                { icon: ChatRoundDots,      title: 'Auto Reply',       desc: 'keyword replies, config per channel, no code edits needed.' },
                { icon: Database,           title: 'Persistent State', desc: 'nothing gets lost on restart. all state lives in DB.' },
                { icon: Code,               title: 'Open Source',      desc: 'whole codebase on GitHub. CC BY-NC-SA 4.0.' },
                { icon: ServerMinimalistic, title: 'Monorepo',         desc: 'three bots, one shared/ folder. zero duplicated logic.' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  className="h-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <FeatureCard {...f} />
                </motion.div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ─── 2 · BYPASS BOT ────────────────────────────────── */}
        <Slide id="bypass" active={section_name === 'bypass'} direction={direction} scrollable>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="mb-6">
              <h2
                className="text-[1.7rem] sm:text-[2.3rem] font-normal text-white mb-2.5 leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                Bypass Bot
              </h2>
              <p className="text-[#4a4a4a] text-[0.82rem] max-w-lg leading-relaxed mb-4">
                was tired of manually clicking through Linkvertise every time I wanted a Roblox script.
                so I built a bot for it. runs as its own process and also powers the bypass page on this dashboard.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['TypeScript', 'discord.js v14', 'Next.js API routes', 'rate-limiting', 'Railway'].map(t => <Pill key={t} label={t} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
              {[
                { icon: Bolt,             title: 'Instant Results',    desc: 'most providers done in under 300ms. it be like that.' },
                { icon: Earth,            title: '100+ Providers',     desc: 'Linkvertise, Work.ink, AdLinkFly, and a whole lot more.' },
                { icon: Chart,            title: 'Usage Tracking',     desc: 'tracks per-user and global stats in Postgres.' },
                { icon: ChatRoundCheck,   title: 'Discord Command',    desc: '/bypass in any server, no website needed.' },
                { icon: Lock,             title: 'Fair-use Limits',    desc: 'rate limiting so nobody gon abuse it.' },
                { icon: Monitor,          title: 'Web Interface',      desc: 'same backend running the bypass page on this dashboard.' },
                { icon: Code,             title: 'Separate Process',   desc: 'runs on its own. bypass crashing won\'t touch atomic_bot.' },
                { icon: LinkMinimalistic, title: 'Deep Link Parsing',  desc: 'handles redirect chains and multi-hop links too.' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  className="h-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <FeatureCard {...f} />
                </motion.div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ─── 3 · JKT48 BOT ─────────────────────────────────── */}
        <Slide id="jkt48" active={section_name === 'jkt48'} direction={direction} scrollable>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="mb-6">
              <h2
                className="text-[1.7rem] sm:text-[2.3rem] font-normal text-white mb-2.5 leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                JKT48 Bot
              </h2>
              <p className="text-[#4a4a4a] text-[0.82rem] max-w-lg leading-relaxed mb-4">
                kept missing JKT48 lives so I built a bot that polls every 60 seconds.
                checks IDN Live and Showroom, drops a notif in Discord soon as someone goes live.
                no external service, just a cron loop and two endpoints.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['TypeScript', 'discord.js v14', 'IDN Live API', 'Showroom API', 'cron', 'Railway'].map(t => <Pill key={t} label={t} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
              {[
                { icon: BellBing,          title: 'Live Alerts',       desc: 'drops a message the second a stream starts. no more missing lives.' },
                { icon: UsersGroupRounded, title: 'Full Roster',       desc: 'all active JKT48 members covered via UUID config file.' },
                { icon: PlayCircle,        title: 'IDN Live',          desc: 'polls IDN Live API using UUIDs from assets/jkt48/.' },
                { icon: Stream,            title: 'Showroom',          desc: 'monitors Showroom room status on a configurable interval.' },
                { icon: Settings,          title: 'Config-driven',     desc: 'wanna disable a member? just edit the .cfg, no code changes.' },
                { icon: ChatRoundDots,     title: 'Channel Routing',   desc: 'route notifs to different channels per member or platform.' },
                { icon: DocumentText,      title: 'No DB needed',      desc: 'stateless poll loop. no DB writes for live stream state.' },
                { icon: Code,              title: 'Open Source',       desc: 'config files and UUIDs are all public in the repo.' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  className="h-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <FeatureCard {...f} />
                </motion.div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ─── 4 · MODERATION ─────────────────────────────────── */}
        <Slide id="moderation" active={section_name === 'moderation'} direction={direction} scrollable>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="mb-6">
              <h2
                className="text-[1.7rem] sm:text-[2.3rem] font-normal text-white mb-2.5 leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                Moderation System
              </h2>
              <p className="text-[#4a4a4a] text-[0.82rem] max-w-lg leading-relaxed mb-4">
                this the most overbuilt part. every mod action goes straight into PostgreSQL, nothing stays in memory.
                cache disabled on purpose with{' '}
                <code className="text-[#555] bg-white/[0.04] px-1 rounded text-[0.7rem]">makeCache: () =&gt; new Collection()</code>
                {' '}so member and role data always comes fresh from REST.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['PostgreSQL', 'makeCache: () => Collection()', 'guild.members.fetch()', 'log_error webhook'].map(t => <Pill key={t} label={t} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
              {[
                { icon: Muted,          title: 'Mute / Timeout',   desc: 'Discord timeout with reason and duration, straight to DB.' },
                { icon: UserBlock,      title: 'Quarantine',       desc: 'strip roles and isolate. state stays even after reboot.' },
                { icon: ClipboardList,  title: 'Audit Log',        desc: 'every mod action in Postgres. queryable whenever.' },
                { icon: DangerTriangle, title: 'Warning System',   desc: 'tracks warns per user with configurable auto-escalation.' },
                { icon: UserCross,      title: 'Kick & Ban',       desc: 'one command, permission check, logged to DB.' },
                { icon: CalendarMark,   title: 'LOA System',       desc: 'staff requests LOA, needs approval, all tracked in DB.' },
                { icon: Database,       title: 'Crash-safe',       desc: 'Postgres is the source of truth, not Discord or RAM.' },
                { icon: Cpu,            title: 'REST-only',        desc: 'makeCache: () => new Collection(). cache empty by design.' },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  className="h-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                >
                  <FeatureCard {...f} />
                </motion.div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ─── 5 · WEB DASHBOARD ───────────────────────────────── */}
        <Slide id="web" active={section_name === 'web'} direction={direction} scrollable>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="mb-6">
              <h2
                className="text-[1.7rem] sm:text-[2.3rem] font-normal text-white mb-2.5 leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                Web Dashboard
              </h2>
              <p className="text-[#4a4a4a] text-[0.82rem] max-w-lg leading-relaxed mb-4">
                Next.js 15 App Router, shadcn/ui, dark mode only.
                some pages are public, some need login. all wired to the same Postgres backend the bots use.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {['Next.js 15', 'shadcn/ui', 'Tailwind CSS', 'Auth.js', 'dark only'].map(t => <Pill key={t} label={t} />)}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
              {[
                {
                  path    : '/dashboard',
                  title   : 'Dashboard',
                  desc    : 'admin panel for tickets, staff management, and mod logs. login required.',
                  icon    : Monitor,
                  badge   : 'protected',
                  full_url: 'https://azure48.xyz/dashboard',
                },
                {
                  path    : '/bypass',
                  title   : 'Bypass Tool',
                  desc    : 'public bypass page. same backend powering the Discord /bypass command.',
                  icon    : LinkMinimalistic,
                  badge   : 'public',
                  full_url: 'https://azure48.xyz/bypass',
                },
                {
                  path    : '/status',
                  title   : 'Bot Stats',
                  desc    : 'real-time stats — bypass count, uptime, command usage breakdown.',
                  icon    : Chart,
                  badge   : 'public',
                  full_url: 'https://azure48.xyz/status',
                },
                {
                  path    : '/staff-information',
                  title   : 'Staff Info',
                  desc    : 'view active staff list, roles, and contact info. synced from DB.',
                  icon    : UsersGroupRounded,
                  badge   : 'public',
                  full_url: 'https://azure48.xyz/staff-information',
                },
                {
                  path    : '/apply-staff',
                  title   : 'Apply as Staff',
                  desc    : 'open application form for joining the server staff team.',
                  icon    : ClipboardList,
                  badge   : 'public',
                  full_url: 'https://azure48.xyz/apply-staff',
                },
                {
                  path    : '/transcript/[id]',
                  title   : 'Ticket Transcript',
                  desc    : 'read-only viewer for closed ticket transcripts. shareable by link.',
                  icon    : DocumentText,
                  badge   : 'public',
                  full_url: 'https://azure48.xyz/transcript',
                },
              ].map((p, i) => (
                <motion.div
                  key={p.title}
                  className="h-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35 }}
                >
                  <WebPageEntry {...p} />
                </motion.div>
              ))}
            </div>
          </div>
        </Slide>

        {/* ─── 6 · STACK ──────────────────────────────────────── */}
        <Slide id="stack" active={section_name === 'stack'} direction={direction} scrollable>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="mb-7">
              <h2
                className="text-[1.7rem] sm:text-[2.3rem] font-normal text-white mb-2.5 leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                How it's built
              </h2>
              <p className="text-[#4a4a4a] text-[0.82rem] max-w-lg leading-relaxed mb-5">
                learned almost all of this by doing it. no courses, just reading Discord.js docs at 2am and figuring it out.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mb-7">
              {[
                {
                  category : 'Bots (src/)',
                  items    : [
                    { icon: Code,               label: 'TypeScript',      note: 'strict mode, path aliases (@shared/*, @atomic/*, etc.)' },
                    { icon: ServerMinimalistic, label: 'discord.js v14',  note: 'Component V2, slash commands, full REST-only' },
                    { icon: Database,           label: 'PostgreSQL',      note: 'pg pool with a MongoDB-style wrapper on top' },
                    { icon: Cpu,                label: 'Railway',         note: '3 Procfiles + Dockerfiles, one dyno per bot' },
                  ],
                },
                {
                  category : 'Dashboard (web/)',
                  items    : [
                    { icon: Monitor, label: 'Next.js 15',    note: 'App Router, server components, API routes' },
                    { icon: Layers,  label: 'shadcn/ui',     note: 'Tailwind CSS, dark mode only. light mode does not exist here.' },
                    { icon: Bolt,    label: 'Framer Motion', note: 'page transitions, scroll-snap, all the animations' },
                    { icon: Lock,    label: 'Auth.js',       note: 'session auth for protected dashboard routes' },
                  ],
                },
              ].map((group, gi) => (
                <motion.div
                  key={group.category}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.1, duration: 0.4 }}
                >
                  <p className="text-[0.67rem] text-[#3a3a3a] tracking-widest mb-2.5">{group.category}</p>
                  <div className="flex flex-col gap-1.5">
                    {group.items.map(item => (
                      <div
                        key={item.label}
                        className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
                      >
                        <SolarIcon icon={item.icon} size={14} iconStyle="LineDuotone" className="text-[#444] mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[0.78rem] text-white/75">{item.label}</span>
                          <span className="text-[0.68rem] text-[#3d3d3d] leading-relaxed">{item.note}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="flex flex-wrap gap-1.5"
            >
              {['CC BY-NC-SA 4.0', 'monorepo', 'no CI/CD yet', 'deployed on Railway'].map(t => (
                <Pill key={t} label={t} />
              ))}
            </motion.div>
          </div>
        </Slide>

        {/* ─── 7 · CTA ────────────────────────────────────────── */}
        <Slide id="cta" active={section_name === 'cta'} direction={direction}>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16">
            <div className="max-w-xs">
              <motion.h2
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
                className="text-[2rem] sm:text-[2.8rem] font-normal text-white leading-[1.1] mb-4"
                style={{ letterSpacing: '-0.03em' }}
              >
                just a side project.<br />
                <span className="text-[#444]">stop by anyway.</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="text-[#4a4a4a] text-[0.84rem] leading-relaxed mb-7"
              >
                Discord server is where I post updates and occasionally break things live.
                code's on GitHub, PRs welcome.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
                className="flex flex-wrap items-center gap-3 mb-6"
              >
                <button
                  onClick={() => set_discord(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] hover:bg-[#4752c4] transition-colors duration-200 px-4 py-2"
                >
                  <DiscordIcon size={14} />
                  <span className="text-white text-[0.82rem]">Join Discord</span>
                </button>
                <a
                  href="https://github.com/bimoraa/atomic_bot"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.06] transition-colors duration-200 px-4 py-2"
                >
                  <GithubIcon size={14} className="text-[#555]" />
                  <span className="text-[#555] text-[0.82rem]">Source Code</span>
                </a>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="text-[#2e2e2e] text-[0.7rem]"
              >
                <a href="/terms-of-service" className="hover:text-[#555] underline underline-offset-2 transition-colors">terms of service</a>
                {' · '}
                <a href="/privacy-policy" className="hover:text-[#555] underline underline-offset-2 transition-colors">privacy policy</a>
                {' · '}
                <a href="/license" className="hover:text-[#555] underline underline-offset-2 transition-colors">license</a>
              </motion.p>
            </div>
          </div>
        </Slide>

        {/* ─── 8 · CREDIT ─────────────────────────────────────── */}
        <Slide id="credit" active={section_name === 'credit'} direction={direction}>
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-16 flex flex-col gap-12">

            {/* - heading - \ */}
            <motion.h2
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
              className="text-[2rem] sm:text-[2.8rem] font-normal text-white leading-[1.1]"
              style={{ letterSpacing: '-0.03em' }}
            >
              made by.
            </motion.h2>

            {/* - creator card - \ */}
            <div className="relative max-w-md">

              <motion.a
                href="https://github.com/bimoraa"
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                onHoverStart={() => set_card_hovered(true)}
                onHoverEnd={() => set_card_hovered(false)}
                className="group relative flex items-center gap-5 z-10"
                style={{ isolation: 'isolate' }}
              >

              {/* - avatar + blobs wrapper - \\ */}
              <div className="relative shrink-0">
                {/* - hover blobs — always animating, visibility controlled by parent opacity - \\ */}
                <motion.div
                  className="absolute pointer-events-none"
                  animate={{ opacity: card_hovered ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  style={{ inset: '-40px', zIndex: 0 }}
                >
                  {/* - purple: clockwise orbit - \\ */}
                  <FloatingBlob color="rgba(115,0,255,0.40)"  size={200} rx={30} ry={22} speed={1.1}  phase={0}   />
                  {/* - blue: counter orbit - \\ */}
                  <FloatingBlob color="rgba(0,183,255,0.32)"   size={160} rx={26} ry={32} speed={-1.5} phase={1.2} />
                  {/* - pink: diagonal - \\ */}
                  <FloatingBlob color="rgba(228,120,255,0.28)" size={150} rx={22} ry={18} speed={1.9}  phase={2.4} />
                  {/* - teal: tight - \\ */}
                  <FloatingBlob color="rgba(0,229,183,0.26)"   size={130} rx={28} ry={26} speed={-1.3} phase={0.8} />
                  {/* - red: fast small - \\ */}
                  <FloatingBlob color="rgba(255,0,64,0.22)"    size={120} rx={18} ry={28} speed={2.2}  phase={3.6} />
                </motion.div>
                <img
                  src="https://github.com/bimoraa.png"
                  alt="bimoraa"
                  width={64}
                  height={64}
                  className="relative z-10 rounded-full grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>
              <div className="flex flex-col gap-2">
                <span
                  className="text-[1.6rem] font-normal text-white/80 leading-none group-hover:text-white transition-colors duration-300"
                  style={{ letterSpacing: '-0.03em' }}
                >
                  bimoraa
                </span>
                <span className="text-[0.78rem] text-[#3a3a3a] leading-relaxed">
                  built this whole thing from scratch.<br />
                  TypeScript enjoyer. up way too late most nights.
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[0.65rem] text-[#2e2e2e] flex items-center gap-1.5 group-hover:text-[#444] transition-colors duration-300">
                    <GithubIcon size={10} />
                    github.com/bimoraa
                  </span>
                  <span className="text-[#1e1e1e] text-[0.5rem]">·</span>
                  <span className="text-[0.65rem] text-[#2e2e2e]">
                    Bandung, ID
                  </span>
                </div>
              </div>
            </motion.a>
            </div>

            {/* - motivational quote - \ */}
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-col gap-2 max-w-xs"
            >
              <p
                className="text-[1rem] text-white/20 font-normal leading-snug"
                style={{ letterSpacing: '-0.02em' }}
              >
                "ship it before you're ready.<br />
                perfect is the enemy of done."
              </p>
              <p className="text-[0.68rem] text-[#1e1e1e]">
                no team. no budget. just vibes and too many late nights.
              </p>
            </motion.div>

          </div>
        </Slide>

      </div>

      {/* - discord redirect confirmation dialog - \ */}
      <Dialog open={discord_dialog} onOpenChange={set_discord}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-50 bg-black/80" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <DialogContent
            from="bottom"
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#111] p-6"
          >
            <DialogHeader>
              <DialogTitle
                className="text-[1rem] font-normal text-white"
                style={{ letterSpacing: '-0.02em' }}
              >
                you leaving?
              </DialogTitle>
              <DialogDescription className="text-[0.78rem] text-[#555] mt-1 leading-relaxed">
                you gon be redirected to{' '}
                <span className="text-[#888]">discord.gg/getsades</span>.
              </DialogDescription>
            </DialogHeader>

            <p className="py-4 text-[0.78rem] text-[#444] leading-relaxed">
              it's where I post updates, answer stuff, and sometimes break things live.
            </p>

            <DialogFooter className="flex gap-2">
              <DialogClose asChild>
                <a
                  href="https://discord.gg/getsades"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#5865F2] hover:bg-[#4752c4] transition-colors duration-200 px-4 py-2"
                >
                  <DiscordIcon size={13} />
                  <span className="text-white text-[0.8rem]">Continue</span>
                </a>
              </DialogClose>
            </DialogFooter>

            <DialogClose className="absolute top-4 right-4 text-[#555] hover:text-white transition-colors">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogContent>
          </div>
        </DialogPortal>
      </Dialog>

    </div>
  )
}
