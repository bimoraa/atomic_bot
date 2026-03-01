'use client'

import { createContext, useContext } from 'react'

// - TYPES - \\

interface discord_user {
  id       : string
  username : string
  avatar  ?: string
}

interface guild_info {
  id           : string
  name         : string
  icon         : string | null
  member_count?: number
}

interface manage_context_value {
  guild_id     : string
  user         : discord_user | null
  guild        : guild_info | null
  loading_auth : boolean
}

// - CONTEXT - \\

export const ManageContext = createContext<manage_context_value>({
  guild_id     : '',
  user         : null,
  guild        : null,
  loading_auth : true,
})

/**
 * @returns Shared manage page context value
 */
export function useManageContext(): manage_context_value {
  return useContext(ManageContext)
}

export type { discord_user, guild_info }
