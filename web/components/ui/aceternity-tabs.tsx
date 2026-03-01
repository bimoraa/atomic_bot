'use client'

import { useState, useRef }        from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn }                      from '@/lib/utils'

interface aceternity_tab {
  title   : string
  value   : string
  content : React.ReactNode
}

interface AceternityTabsProps {
  tabs       : aceternity_tab[]
  className? : string
}

/**
 * Aceternity-style 3D perspective tabs.
 * Inactive tabs stack behind the active one with a slight 3D rotation.
 * @param tabs      - Array of { title, value, content }
 * @param className - Extra classes for the wrapper
 */
export function AceternityTabs({ tabs, className }: AceternityTabsProps) {
  const [active, set_active]     = useState<string>(tabs[0]?.value ?? '')
  const [hovering, set_hovering] = useState<string | null>(null)

  const active_idx = tabs.findIndex(t => t.value === active)

  return (
    <div className={cn('w-full', className)}>

      {/* - TAB BAR - \\ */}
      <div className="relative flex flex-row items-center justify-start overflow-auto no-scrollbar mb-6">
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => set_active(tab.value)}
            onMouseEnter={() => set_hovering(tab.value)}
            onMouseLeave={() => set_hovering(null)}
            className={cn(
              'relative px-4 py-2 rounded-full text-sm transition-colors duration-150 whitespace-nowrap',
              tab.value === active
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {/* - HOVER HIGHLIGHT - \\ */}
            {hovering === tab.value && tab.value !== active && (
              <motion.div
                layoutId="hover_pill_ace"
                className="absolute inset-0 rounded-full bg-muted"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
              />
            )}

            {/* - ACTIVE PILL - \\ */}
            {tab.value === active && (
              <motion.div
                layoutId="active_pill_ace"
                className="absolute inset-0 rounded-full bg-secondary border border-border"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
              />
            )}

            <span className="relative z-10">{tab.title}</span>
          </button>
        ))}
      </div>

      {/* - CONTENT AREA - \\ */}
      <div className="relative w-full [perspective:1000px]">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab, idx) => {
            const is_active = tab.value === active
            const offset    = idx - active_idx

            if (!is_active && Math.abs(offset) > 2) return null

            return (
              <motion.div
                key={tab.value}
                initial={is_active
                  ? { opacity: 0, scale: 0.96, y: 10 }
                  : false
                }
                animate={is_active
                  ? { opacity: 1, scale: 1, y: 0, rotateX: 0, translateZ: 0 }
                  : {
                      opacity      : Math.max(0, 1 - Math.abs(offset) * 0.4),
                      scale        : 1 - Math.abs(offset) * 0.04,
                      y            : offset * -8,
                      rotateX      : offset > 0 ? -6 : 6,
                      translateZ   : -Math.abs(offset) * 40,
                      pointerEvents: 'none',
                    }
                }
                exit={{ opacity: 0, scale: 0.96, y: -10 }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                style={{
                  position    : is_active ? 'relative' : 'absolute',
                  top         : 0,
                  left        : 0,
                  width       : '100%',
                  zIndex      : is_active ? 10 : 10 - Math.abs(offset),
                  transformOrigin: '50% 0%',
                }}
              >
                {tab.content}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
