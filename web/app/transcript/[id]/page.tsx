/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { get_transcript } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { TranscriptClientView } from './transcript_client_view'

export default async function TranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }       = await params
  // - Check authentication - \\
  const cookie_store = await cookies()
  const discord_user = cookie_store.get('discord_user')
  
  if (!discord_user) {
    redirect(`/login?return_to=/transcript/${id}`)
  }

  let user_data = null
  try {
    user_data = JSON.parse(decodeURIComponent(discord_user.value))
  } catch (e) {
    try {
      user_data = JSON.parse(discord_user.value)
    } catch(err) {}
  }

  const transcript = await get_transcript(id)

  if (!transcript) {
    notFound()
  }

  return <TranscriptClientView transcript={transcript} user_data={user_data} />
}

