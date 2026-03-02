'use client'

import { FloatingDock }                from '@/components/ui/floating-dock'
import { Settings2, FileText, Link2 } from 'lucide-react'

// - bypass dashboard nav items - \\
const __nav_items = [
  {
    title : 'Bypass',
    icon  : <Link2 className="h-full w-full text-neutral-400" />,
    href  : '/bypass',
  },
  {
    title : 'Configure',
    icon  : <Settings2 className="h-full w-full text-neutral-400" />,
    href  : '/bypass/dashboard',
  },
  {
    title : 'Transcripts',
    icon  : <FileText className="h-full w-full text-neutral-400" />,
    href  : '/bypass/dashboard/transcripts',
  },
]

export function BypassFloatingDock() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock
        items={__nav_items}
        desktopClassName="shadow-xl"
        mobileClassName=""
      />
    </div>
  )
}
