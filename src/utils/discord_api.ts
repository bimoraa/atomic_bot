import { message_payload } from "./components"
import { ButtonInteraction, CommandInteraction } from "discord.js"

const base_url = "https://discord.com/api/v10"

export interface api_response {
  id?: string
  error?: boolean
  [key: string]: unknown
}

export interface webhook_payload {
  content?: string
  username?: string
  avatar_url?: string
  embeds?: object[]
  components?: object[]
  flags?: number
}

export async function send_components_v2(
  channel_id: string,
  token: string,
  payload: message_payload
): Promise<api_response> {
  const response = await fetch(`${base_url}/channels/${channel_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function edit_components_v2(
  channel_id: string,
  message_id: string,
  token: string,
  payload: message_payload
): Promise<api_response> {
  const response = await fetch(`${base_url}/channels/${channel_id}/messages/${message_id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function delete_message(
  channel_id: string,
  message_id: string,
  token: string
): Promise<boolean> {
  const response = await fetch(`${base_url}/channels/${channel_id}/messages/${message_id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  return response.ok
}

export async function edit_interaction_response(
  application_id: string,
  interaction_token: string,
  payload: message_payload
): Promise<api_response> {
  const response = await fetch(
    `${base_url}/webhooks/${application_id}/${interaction_token}/messages/@original`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function send_components_v2_followup(
  interaction: ButtonInteraction | CommandInteraction,
  payload: message_payload
): Promise<api_response> {
  const response = await fetch(
    `${base_url}/webhooks/${interaction.applicationId}/${interaction.token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function edit_deferred_reply(
  interaction: ButtonInteraction | CommandInteraction,
  payload: message_payload
): Promise<api_response> {
  const response = await fetch(
    `${base_url}/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  )

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function bulk_delete_messages(
  channel_id: string,
  message_ids: string[],
  token: string
): Promise<boolean> {
  const response = await fetch(`${base_url}/channels/${channel_id}/messages/bulk-delete`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: message_ids }),
  })

  return response.ok
}

export async function get_message(
  channel_id: string,
  message_id: string,
  token: string
): Promise<api_response> {
  const response = await fetch(`${base_url}/channels/${channel_id}/messages/${message_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function get_channel_messages(
  channel_id: string,
  token: string,
  limit: number = 50
): Promise<api_response[]> {
  const response = await fetch(`${base_url}/channels/${channel_id}/messages?limit=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  if (!response.ok) {
    return []
  }

  return (await response.json()) as api_response[]
}

export async function add_reaction(
  channel_id: string,
  message_id: string,
  emoji: string,
  token: string
): Promise<boolean> {
  const encoded_emoji = encodeURIComponent(emoji)
  const response = await fetch(
    `${base_url}/channels/${channel_id}/messages/${message_id}/reactions/${encoded_emoji}/@me`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${token}`,
      },
    }
  )

  return response.ok
}

export async function remove_reaction(
  channel_id: string,
  message_id: string,
  emoji: string,
  token: string,
  user_id?: string
): Promise<boolean> {
  const encoded_emoji = encodeURIComponent(emoji)
  const target = user_id || "@me"
  const response = await fetch(
    `${base_url}/channels/${channel_id}/messages/${message_id}/reactions/${encoded_emoji}/${target}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${token}`,
      },
    }
  )

  return response.ok
}

export async function pin_message(
  channel_id: string,
  message_id: string,
  token: string
): Promise<boolean> {
  const response = await fetch(`${base_url}/channels/${channel_id}/pins/${message_id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  return response.ok
}

export async function unpin_message(
  channel_id: string,
  message_id: string,
  token: string
): Promise<boolean> {
  const response = await fetch(`${base_url}/channels/${channel_id}/pins/${message_id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  return response.ok
}

export async function send_webhook(
  webhook_url: string,
  payload: webhook_payload
): Promise<api_response> {
  const response = await fetch(webhook_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    return { error: true }
  }

  if (response.status === 204) {
    return {}
  }

  return (await response.json()) as api_response
}

export async function create_dm_channel(user_id: string, token: string): Promise<api_response> {
  const response = await fetch(`${base_url}/users/@me/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: user_id }),
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function send_dm(
  user_id: string,
  token: string,
  payload: message_payload
): Promise<api_response> {
  const dm_channel = await create_dm_channel(user_id, token)

  if (dm_channel.error || !dm_channel.id) {
    return { error: true }
  }

  return send_components_v2(dm_channel.id, token, payload)
}

export async function get_user(user_id: string, token: string): Promise<api_response> {
  const response = await fetch(`${base_url}/users/${user_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function get_guild_member(
  guild_id: string,
  user_id: string,
  token: string
): Promise<api_response> {
  const response = await fetch(`${base_url}/guilds/${guild_id}/members/${user_id}`, {
    method: "GET",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function add_guild_member_role(
  guild_id: string,
  user_id: string,
  role_id: string,
  token: string
): Promise<boolean> {
  const response = await fetch(`${base_url}/guilds/${guild_id}/members/${user_id}/roles/${role_id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  return response.ok
}

export async function remove_guild_member_role(
  guild_id: string,
  user_id: string,
  role_id: string,
  token: string
): Promise<boolean> {
  const response = await fetch(`${base_url}/guilds/${guild_id}/members/${user_id}/roles/${role_id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bot ${token}`,
    },
  })

  return response.ok
}

export async function create_thread(
  channel_id: string,
  name: string,
  token: string,
  options?: {
    auto_archive_duration?: 60 | 1440 | 4320 | 10080
    type?: 10 | 11 | 12
    invitable?: boolean
  }
): Promise<api_response> {
  const response = await fetch(`${base_url}/channels/${channel_id}/threads`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      auto_archive_duration: options?.auto_archive_duration || 1440,
      type: options?.type || 11,
      invitable: options?.invitable,
    }),
  })

  const data = (await response.json()) as api_response

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export function get_token(): string {
  return process.env.DISCORD_TOKEN!
}

export function avatar_url(user_id: string, avatar_hash: string, format: string = "png"): string {
  return `https://cdn.discordapp.com/avatars/${user_id}/${avatar_hash}.${format}`
}

export function guild_icon_url(guild_id: string, icon_hash: string, format: string = "png"): string {
  return `https://cdn.discordapp.com/icons/${guild_id}/${icon_hash}.${format}`
}

export function emoji_url(emoji_id: string, animated: boolean = false): string {
  return `https://cdn.discordapp.com/emojis/${emoji_id}.${animated ? "gif" : "png"}`
}
