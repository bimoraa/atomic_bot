import { message_payload } from "./components"
import { ButtonInteraction, CommandInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from "discord.js"

const base_url = "https://discord.com/api/v10"

/**
 * - SAFE JSON PARSE RESPONSE - \\
 * @param {Response} response - Fetch response
 * @returns {Promise<unknown>} Parsed response body
 */
async function safe_parse_response_json(response: Response): Promise<unknown> {
  const body_text = await response.text()

  if (!body_text) {
    return {}
  }

  try {
    return JSON.parse(body_text)
  } catch {
    return {
      error        : true,
      parse_error  : "invalid_json_response",
      status       : response.status,
      content_type : response.headers.get("content-type") || "unknown",
      body_preview : body_text.slice(0, 300),
    }
  }
}

/**
 * - ENSURE API RESPONSE OBJECT - \\
 * @param {unknown} value - Parsed value
 * @returns {api_response} Object response
 */
function as_api_response(value: unknown): api_response {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as api_response
  }

  return {}
}

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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function edit_deferred_reply(
  interaction: ButtonInteraction | CommandInteraction | ModalSubmitInteraction,
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

  const data = as_api_response(await safe_parse_response_json(response))

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export async function edit_deferred_reply_v2_with_file(
  interaction: ButtonInteraction | CommandInteraction | StringSelectMenuInteraction,
  components: object[],
  file_content: string,
  filename: string
): Promise<void> {
  const form_data = new FormData()

  form_data.append(
    "payload_json",
    JSON.stringify({
      flags: 32768,
      components,
      attachments: [{ id: 0, filename }],
    })
  )

  const blob = new Blob([file_content], { type: "text/plain" })
  form_data.append("files[0]", blob, filename)

  const url = `${base_url}/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`

  await fetch(url, {
    method: "PATCH",
    body: form_data,
  })
}

export interface file_attachment {
  name:    string
  content: Buffer
}

export async function edit_deferred_reply_with_files(
  interaction: ButtonInteraction | CommandInteraction,
  payload: message_payload,
  files: file_attachment[]
): Promise<api_response> {
  const FormData = (await import("form-data")).default
  const form     = new FormData()

  const payload_json = {
    ...payload,
    attachments: files.map((f, i) => ({ id: i, filename: f.name })),
  }

  form.append("payload_json", JSON.stringify(payload_json))

  files.forEach((file, index) => {
    form.append(`files[${index}]`, file.content, { filename: file.name })
  })

  const response = await fetch(
    `${base_url}/webhooks/${interaction.applicationId}/${interaction.token}/messages/@original`,
    {
      method: "PATCH",
      headers: form.getHeaders(),
      body: form as any,
    }
  )

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = await safe_parse_response_json(response)
  if (!Array.isArray(data)) {
    return []
  }

  return data as api_response[]
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

  return as_api_response(await safe_parse_response_json(response))
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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

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

  const data = as_api_response(await safe_parse_response_json(response))

  if (!response.ok) {
    return { error: true, ...data }
  }

  return data
}

export function get_token(): string {
  const is_dev = process.env.NODE_ENV === "development"
  return is_dev ? process.env.DEV_DISCORD_TOKEN! : process.env.DISCORD_TOKEN!
}

export async function upload_image(
  channel_id: string,
  token: string,
  file_path: string,
  filename: string = "image.png"
): Promise<string | null> {
  const fs = await import("fs")
  const path = await import("path")
  const FormData = (await import("form-data")).default

  const file_buffer = fs.readFileSync(file_path)
  const form = new FormData()
  form.append("file", file_buffer, { filename })

  const response = await fetch(`${base_url}/channels/${channel_id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      ...form.getHeaders(),
    },
    body: form as any,
  })

  if (!response.ok) return null

  const data = await safe_parse_response_json(response) as any
  if (data.attachments && data.attachments.length > 0) {
    return data.attachments[0].url
  }

  return null
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
