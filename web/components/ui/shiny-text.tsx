import { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

interface shiny_text_props {
  text         : string
  speed?       : number
  delay?       : number
  color?       : string
  shine_color? : string
  spread?      : number
  direction?   : 'left' | 'right'
  yoyo?        : boolean
  pause_on_hover? : boolean
  disabled?    : boolean
  className?   : string
}

/**
 * Shiny text effect component inspired by reactbits.dev/text-animations/shiny-text
 * @param text           - Text to display
 * @param speed          - Animation cycle duration in seconds
 * @param delay          - Pause between cycles in seconds
 * @param color          - Base text color
 * @param shine_color    - Highlight/shine color
 * @param spread         - Gradient spread angle in degrees
 * @param direction      - Shine movement direction
 * @param yoyo           - Reverse on each cycle instead of looping
 * @param pause_on_hover - Pause animation on hover
 * @param disabled       - Disable the shine effect
 * @param className      - Additional class names
 */
export function ShinyText({
  text,
  speed          = 2,
  delay          = 0,
  color          = '#b5b5b5',
  shine_color    = '#ffffff',
  spread         = 120,
  direction      = 'left',
  yoyo           = false,
  pause_on_hover = false,
  disabled       = false,
  className,
}: shiny_text_props) {
  const from = direction === 'left' ? '100%' : '-100%'
  const to   = direction === 'left' ? '-100%' : '100%'

  // - BUILD KEYFRAME STYLE TAG ID - \\
  const animation_name = `shiny_text_${direction}_${yoyo ? 'yoyo' : 'loop'}`

  const style: CSSProperties & Record<string, string> = {
    '--shiny-from'  : from,
    '--shiny-to'    : to,
    '--shiny-color' : color,
    '--shiny-shine' : shine_color,
    '--shiny-speed' : `${speed}s`,
    '--shiny-delay' : `${delay}s`,
    '--shiny-spread': `${spread}deg`,
    backgroundImage : `linear-gradient(
      var(--shiny-spread),
      transparent 0%,
      var(--shiny-shine) 50%,
      transparent 100%
    ), linear-gradient(var(--shiny-color), var(--shiny-color))`,
    backgroundSize     : '200% 100%, 100% 100%',
    backgroundPosition : 'var(--shiny-from) center, 0 0',
    backgroundRepeat   : 'no-repeat, no-repeat',
    WebkitBackgroundClip : 'text',
    backgroundClip       : 'text',
    WebkitTextFillColor  : 'transparent',
    color                : 'transparent',
    display              : 'inline-block',
    animation            : disabled
      ? 'none'
      : `${animation_name} ${speed}s ${delay > 0 ? `${delay}s` : ''} ${yoyo ? 'alternate' : 'normal'} infinite linear`,
  }

  return (
    <>
      {/* - INJECT KEYFRAMES ONCE PER DIRECTION/MODE COMBO - \\ */}
      <style>{`
        @keyframes ${animation_name} {
          0%   { background-position: ${from} center, 0 0; }
          100% { background-position: ${to} center, 0 0; }
        }
      `}</style>
      <span
        style={style}
        className={cn(pause_on_hover && 'hover:[animation-play-state:paused]', className)}
      >
        {text}
      </span>
    </>
  )
}
