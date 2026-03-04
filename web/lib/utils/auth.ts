import { NextRequest } from 'next/server'

const __bot_url         = process.env.NEXT_PUBLIC_BOT_URL || 'https://atomicbot-production.up.railway.app'
const __allowed_role_id = "1346622175985143908"
const __min_position    = 112
const __owner_id        = "1118453649727823974"

export interface auth_user {
  id          : string
  username    : string
  global_name?: string
  avatar?     : string
}

/**
 * @description Parse discord_user cookie safely, returns null on any failure.
 * @param req - Incoming Next.js request
 * @returns Parsed user object or null
 */
function parse_session(req: NextRequest): auth_user | null {
  try {
    const cookie = req.cookies.get('discord_user')
    if (!cookie?.value) return null
    const user = JSON.parse(cookie.value)
    if (!user || typeof user.id !== 'string' || !user.id) return null
    return user as auth_user
  } catch {
    return null
  }
}

/**
 * @description Verify a user has the required staff role via bot API (5s timeout).
 * Owner ID bypasses the check entirely.
 * @param user - Parsed session user
 * @returns true if authorized, false otherwise
 */
async function has_staff_role(user: auth_user): Promise<boolean> {
  if (user.id === __owner_id) return true

  try {
    const controller = new AbortController()
    const timeout_id = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${__bot_url}/api/member/${user.id}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout_id)

    if (!res.ok) return false

    const member_data = await res.json()
    return member_data.roles?.some(
      (r: any) => r.id === __allowed_role_id || r.position >= __min_position
    ) ?? false
  } catch {
    return false
  }
}

/**
 * @description Full auth check: validates session cookie and staff role.
 * @param req - Incoming Next.js request
 * @returns Authenticated user or null
 */
export async function check_auth(req: NextRequest): Promise<auth_user | null> {
  const user = parse_session(req)
  if (!user) return null
  const ok = await has_staff_role(user)
  return ok ? user : null
}

/**
 * @description Session-only auth check: validates cookie exists and is parseable,
 * without checking Discord roles. Used for user-owned resources.
 * @param req - Incoming Next.js request
 * @returns Authenticated user or null
 */
export function check_session(req: NextRequest): auth_user | null {
  return parse_session(req)
}

/**
 * @description Validate a UUID v4 string format.
 * @param uuid - String to validate
 * @returns true if valid UUID v4 format
 */
export function is_valid_uuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)
}
