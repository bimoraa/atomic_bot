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