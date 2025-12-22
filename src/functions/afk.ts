interface AfkData {
  user_id           : string
  reason            : string
  timestamp         : number
  original_nickname : string | null
}

const afk_users = new Map<string, AfkData>()

export function set_afk(user_id: string, reason: string, original_nickname: string | null): void {
  afk_users.set(user_id, {
    user_id,
    reason,
    timestamp         : Date.now(),
    original_nickname,
  })
}

export function remove_afk(user_id: string): AfkData | null {
  const data = afk_users.get(user_id)
  if (data) {
    afk_users.delete(user_id)
    return data
  }
  return null
}

export function get_afk(user_id: string): AfkData | null {
  return afk_users.get(user_id) || null
}

export function is_afk(user_id: string): boolean {
  return afk_users.has(user_id)
}
