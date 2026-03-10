/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

'use client'

import { useEffect }       from 'react'
import { useRouter,
         useParams }       from 'next/navigation'

// - REDIRECT TO OVERVIEW - \\

export default function ManageGuildPage() {
  const router   = useRouter()
  const params   = useParams()
  const guild_id = params.guild_id as string

  useEffect(() => {
    router.replace(`/bypass/manage/${guild_id}/overview`)
  }, [guild_id, router])

  return null
}