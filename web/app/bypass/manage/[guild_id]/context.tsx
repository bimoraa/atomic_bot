/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

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
