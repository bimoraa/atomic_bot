'use client'

import { useState, useRef } from 'react'
import { motion }           from 'motion/react'
import { cn }               from '@/lib/utils'

interface tab_item {
  title : string
  value : string
}

interface TabsProps {
  tabs          : tab_item[]
  active        : string
  on_change     : (value: string) => void
  className?    : string
  tab_class?    : string
  active_class? : string
}

/**
 * Animated pill-style tab bar (Aceternity-style).
 * @param tabs         - Array of { title, value }
 * @param active       - Currently active tab value
 * @param on_change    - Callback when tab changes
 * @param className    - Extra classes for the container
 * @param tab_class    - Extra classes for each tab button
 * @param active_class - Extra classes for the active pill background
 */
export function Tabs({
  tabs,
  active,
  on_change,
  className,
  tab_class,
  active_class,
}: TabsProps) {
  const [hovering, set_hovering] = useState<string | null>(null)

  return (
    <div
      className={cn(
        'relative flex flex-row items-center justify-start overflow-auto sm:overflow-visible no-scrollbar',
        className
      )}
    >
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => on_change(tab.value)}
          onMouseEnter={() => set_hovering(tab.value)}
          onMouseLeave={() => set_hovering(null)}
          className={cn(
            'relative px-4 py-2 rounded-full text-sm capitalize transition-colors duration-150 whitespace-nowrap',
            tab.value === active
              ? 'text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
            tab_class
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* - HOVER HIGHLIGHT - \\ */}
          {hovering === tab.value && tab.value !== active && (
            <motion.div
              layoutId="hover_pill"
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
              layoutId="active_pill"
              className={cn(
                'absolute inset-0 rounded-full bg-secondary border border-border',
                active_class
              )}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
            />
          )}

          <span className="relative z-10">{tab.title}</span>
        </button>
      ))}
    </div>
  )
}
