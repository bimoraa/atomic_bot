 /*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - script_key 验证缓存，防止重复请求 Luarmor - \\
// - script_key validation cache, prevents hammering luarmor - \\
import { createHash }        from "crypto"
import { get_user_by_key }   from "@integrations/api/luarmor"

// - 有效 key TTL: 30 分钟，无效 key TTL: 5 分钟 - \\
// - valid key ttl: 30 min, invalid key ttl: 5 min - \\
const __valid_ttl   = 30 * 60 * 1000
const __invalid_ttl =  5 * 60 * 1000

interface key_cache_entry {
  valid      : boolean
  expires_at : number
}

const __cache = new Map<string, key_cache_entry>()

/**
 * @description derive a short sha256 hex hash of a script key (first 16 chars)
 * @param script_key - raw script key from the request
 * @returns 16-char hex string used as DB identifier
 */
export function derive_key_hash(script_key: string): string {
  return createHash("sha256").update(script_key).digest("hex").substring(0, 16)
}

/**
 * @description validate a script key against luarmor (result is cached in-memory)
 * @param script_key - raw script key submitted in Authorization header
 * @returns true if the key is a valid active luarmor key, false otherwise
 */
export async function validate_script_key(script_key: string): Promise<boolean> {
  const now       = Date.now()
  const cache_key = derive_key_hash(script_key)

  // - 命中缓存直接返回 - \\
  // - cache hit, return early - \\
  const cached = __cache.get(cache_key)
  if (cached && now < cached.expires_at) {
    return cached.valid
  }

  // - 通过 Luarmor API 验证 - \\
  // - validate via luarmor api - \\
  const result = await get_user_by_key(script_key).catch(() => ({ success: false }))
  const valid  = result.success === true

  __cache.set(cache_key, {
    valid,
    expires_at : now + (valid ? __valid_ttl : __invalid_ttl),
  })

  return valid
}

/**
 * @description forcibly evict a script key from the validation cache
 * @param script_key - raw script key
 * @returns void
 */
export function invalidate_key(script_key: string): void {
  __cache.delete(derive_key_hash(script_key))
}

/**
 * @description return the current size of the key validation cache (for diagnostics)
 * @returns number of cached entries
 */
export function cache_size(): number {
  return __cache.size
}
