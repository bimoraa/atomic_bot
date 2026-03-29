/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { get_tempvoice_transcript }      from "@/lib/db"
import { notFound, redirect }            from "next/navigation"
import { cookies }                       from "next/headers"
import { decrypt_session }               from "@/lib/utils/session"
import { TempvoiceClientView }           from "./tempvoice_client_view"

export default async function TempvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id }       = await params
  const cookie_store = await cookies()
  const discord_user = cookie_store.get("discord_user")

  if (!discord_user) {
    redirect(`/login?return_to=/tempvoice/${id}`)
  }

  const user_data = await decrypt_session(discord_user.value)

  if (!user_data) {
    redirect(`/login?return_to=/tempvoice/${id}`)
  }

  const transcript = await get_tempvoice_transcript(id)

  if (!transcript) {
    notFound()
  }

  // - owner のみ閲覧可能、それ以外は 404 - \\
  // - only the channel owner can view, others see 404 - \\
  if (user_data?.id !== transcript.owner_id) {
    notFound()
  }

  return <TempvoiceClientView transcript={transcript} user_data={user_data} />
}
