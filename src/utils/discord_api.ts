import { message_payload } from "./components"

const base_url = "https://discord.com/api/v10"

export interface api_response {
  id?: string
  error?: boolean
  [key: string]: unknown
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

export function get_token(): string {
  return process.env.DISCORD_TOKEN!
}
