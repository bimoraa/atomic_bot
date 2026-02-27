'use client'

import { FloatingDock }                                                                        from '@/components/ui/floating-dock'
import { IconLink, IconList, IconBrandDiscord, IconRobot, IconHeart } from '@tabler/icons-react'

const __discord_url    = process.env.NEXT_PUBLIC_DISCORD_URL    || 'https://discord.gg/getsades'
const __bot_invite_url = 'https://discord.com/oauth2/authorize?client_id=1476977037070696612&permissions=4591571295135744&integration_type=0&scope=bot'

const __dock_items = [
  {
    title : 'Bypass',
    icon  : <IconLink className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href  : '/bypass',
  },
  {
    title : 'Supported Links',
    icon  : <IconList className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href  : '/bypass/supported',
  },
  {
    title : 'Discord',
    icon  : <IconBrandDiscord className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href  : __discord_url,
  },
  {
    title : 'Invite Bot',
    icon  : <IconRobot className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href  : __bot_invite_url,
  },
  {
    title : 'Credits',
    icon  : <IconHeart className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href  : '/bypass/credits',
  },
]

export function BypassTopbar() {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <FloatingDock items={__dock_items} />
    </div>
  )
}
