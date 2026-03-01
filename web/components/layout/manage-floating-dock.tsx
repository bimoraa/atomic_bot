'use client'

import { FloatingDock }                          from '@/components/ui/floating-dock'
import { BarChart2, ShieldCheck, Settings2,
         ScrollText }                            from 'lucide-react'

interface ManageFloatingDockProps {
  guild_id : string
}

/**
 * @param guild_id - Discord guild ID for building route hrefs
 */
export function ManageFloatingDock({ guild_id }: ManageFloatingDockProps) {
  const base = `/bypass/manage/${guild_id}`

  const nav_items = [
    {
      title : 'Overview',
      icon  : <BarChart2 className="h-full w-full text-neutral-400" />,
      href  : `${base}/overview`,
    },
    {
      title : 'Bypass Management',
      icon  : <ShieldCheck className="h-full w-full text-neutral-400" />,
      href  : `${base}/bypass-management`,
    },
    {
      title : 'Log',
      icon  : <ScrollText className="h-full w-full text-neutral-400" />,
      href  : `${base}/log`,
    },
    {
      title : 'Settings',
      icon  : <Settings2 className="h-full w-full text-neutral-400" />,
      href  : `${base}/settings`,
    },
  ]

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock
        items={nav_items}
        desktopClassName="shadow-xl"
        mobileClassName=""
      />
    </div>
  )
}
