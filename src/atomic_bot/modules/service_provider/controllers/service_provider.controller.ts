/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 服务提供商功能的模块控制器 - \
// - module controller for the service provider feature - \
// - 服务提供商控制器，处理脚本逻辑 - \
// - service provider controller, handles script logic - \

import { Client }                from "discord.js"
import { db, component }         from "@shared/utils"
import { log_error }             from "@shared/utils/error_logger"
import * as luarmor              from "@atomic/infrastructure/api/luarmor"

const __reset_collection            = "service_provider_resets"
const __user_cache_collection       = "service_provider_user_cache"
const __hwid_reset_tracker          = "hwid_reset_tracker"
const __hwid_reset_cache            = "hwid_reset_cache"
const __hwid_less_status_collection = "hwid_less_status"
const __hwid_less_status_key        = "auto_hwid_less"
const __cache_duration_ms           = 120 * 60 * 1000
const __reset_cache_ttl_ms          = 30000
const __reset_threshold             = 100
const __hwid_less_duration_ms       = 60 * 60 * 1000
const __project_id                  = "6958841b2d9e5e049a24a23e376e0d77"
const __notification_user           = "1118453649727823974"

let __auto_hwid_less_lock          = false
let __auto_disable_timer           : NodeJS.Timeout | null = null
let __auto_disable_expires_at      : number | null         = null

/**
 * - 检查错误是否为限速 - \\
 * - check if error is rate limited - \\
 * @param {string} error_message - error message to check
 * @returns {boolean} true if rate limited
 */
function is_rate_limited(error_message?: string): boolean {
  if (!error_message) return false
  const msg = error_message.toLowerCase()
  return msg.includes("ratelimit") || msg.includes("rate limit") || msg.includes("too many requests")
}

/**
 * - 检查用户是否不存在 - \\
 * - check if user not found - \\
 * @param {string | undefined} error_message - error message to check
 * @returns {boolean} true if user is not found
 */
function is_user_not_found(error_message?: string): boolean {
  if (!error_message) return false
  const msg = error_message.toLowerCase()
  return msg.includes("user not found")
}

/**
 * - 创建限速消息 - \\
 * - create rate limit message - \\
 * @param {string} feature_name - feature name being rate limited
 * @returns {object} component message for rate limit
 */
export function create_rate_limit_message(feature_name: string) {
  const retry_timestamp = Math.floor(Date.now() / 1000) + 60

  return component.build_message({
    components: [
      component.container({
        accent_color: 15277667,
        components: [
          component.text("## Error!"),
        ],
      }),
      component.container({
        components: [
          component.text([
            "**Sorry for the inconvenience.**",
            `The **${feature_name}** feature is currently having an issue and has been **rate-limited by Luarmor**.`,
          ]),
          component.separator(2),
          component.text("HWID reset may be disabled by the developer. You can execute the script directly in-game without resetting your HWID."),
        ],
      }),
      component.container({
        components: [
          component.text([
            `Please wait around **<t:${retry_timestamp}:R>** before trying again.`,
            "Thank you so much for your patience and understanding.",
          ]),
        ],
      }),
    ],
  })
}

interface reset_record {
  _id?          : any
  user_id       : string
  last_reset_at : number
}

interface cached_user {
  _id?         : any
  user_id      : string
  user_data    : luarmor.luarmor_user
  cached_at    : number
  last_updated : number
}

/**
 * - 从数据库获取缓存用户 - \\
 * - get cached user from database - \\
 * @param {string} user_id - discord user ID
 * @returns {Promise<luarmor.luarmor_user | null>} cached user data or null
 */
async function get_cached_user(user_id: string): Promise<luarmor.luarmor_user | null> {
  try {
    if (!db.is_connected()) {
      console.log("[ - SERVICE PROVIDER CACHE - ] DB not connected, skipping cache lookup")
      return null
    }

    const cached = await db.find_one<cached_user>(__user_cache_collection, { user_id })

    if (!cached) {
      console.log(`[ - SERVICE PROVIDER CACHE - ] Cache miss for user_id: ${user_id}`)
      return null
    }

    const now = Date.now()
    if (now - cached.cached_at > __cache_duration_ms) {
      console.log(`[ - SERVICE PROVIDER CACHE - ] Cache expired for user_id: ${user_id} (age: ${Math.floor((now - cached.cached_at) / 1000)}s)`)
      return null
    }

    console.log(`[ - SERVICE PROVIDER CACHE - ] Cache hit for user_id: ${user_id}`)
    return cached.user_data
  } catch (error) {
    console.error("[ - SERVICE PROVIDER CACHE - ] Error reading cache:", error)
    return null
  }
}

/**
 * - 保存用户到缓存 - \\
 * - save user to cache - \\
 * @param {string} user_id - discord user ID
 * @param {luarmor.luarmor_user} user_data - user data to cache
 * @returns {Promise<void>}
 */
async function save_cached_user(user_id: string, user_data: luarmor.luarmor_user): Promise<void> {
  try {
    if (!db.is_connected()) {
      console.log("[ - SERVICE PROVIDER CACHE - ] DB not connected, skipping cache save")
      return
    }

    const now = Date.now()
    await db.update_one<cached_user>(
      __user_cache_collection,
      { user_id },
      {
        user_id      : user_id,
        user_data    : user_data,
        cached_at    : now,
        last_updated : now,
      },
      true
    )
    console.log(`[ - SERVICE PROVIDER CACHE - ] Saved cache for user_id: ${user_id}`)
  } catch (error) {
    console.error(`[ - SERVICE PROVIDER CACHE - ] Error saving cache for user_id: ${user_id}`, error)
  }
}

interface hwid_reset_request {
  _id?      : any
  timestamp : number
  user_id   : string
}

interface hwid_less_status {
  _id?                  : any
  status_key            : string
  enabled               : boolean
  enabled_at            : number
  expires_at            : number
  triggered_by          : string
  reset_count           : number
  disabled_at           : number | null
  disable_notified_at   : number | null
}

interface hwid_reset_cache_entry {
  _id?        : any
  reset_count : number
  cached_at   : number
}

/**
 * - 获取缓存的重置次数 - \\
 * - get cached reset count - \\
 * @returns {Promise<number | null>} cached reset count or null
 */
async function get_cached_reset_count(): Promise<number | null> {
  try {
    const cached = await db.find_one<hwid_reset_cache_entry>(__hwid_reset_cache, {})

    if (!cached) return null

    const now = Date.now()
    if (now - cached.cached_at > __reset_cache_ttl_ms) {
      return null
    }

    return cached.reset_count
  } catch (error) {
    return null
  }
}

/**
 * - 保存重置次数到缓存 - \\
 * - save reset count to cache - \\
 * @param {number} reset_count - reset count to cache
 * @returns {Promise<void>}
 */
async function save_reset_count_cache(reset_count: number): Promise<void> {
  try {
    await db.delete_many(__hwid_reset_cache, {})

    await db.insert_one(__hwid_reset_cache, {
      reset_count : reset_count,
      cached_at   : Date.now(),
    })
  } catch (error) {
    console.error("[ - HWID RESET TRACKER - ] Failed to cache reset count:", error)
  }
}

/**
 * - 追踪 HWID 重置请求 - \\
 * - track hwid reset request - \\
 * @param {string} user_id - discord user ID
 * @returns {Promise<void>}
 */
async function track_hwid_reset(user_id: string): Promise<void> {
  try {
    await db.insert_one(__hwid_reset_tracker, {
      user_id   : user_id,
      timestamp : Date.now(),
    })

    await db.delete_many(__hwid_reset_cache, {})
  } catch (error) {
    console.error("[ - HWID RESET TRACKER - ] Failed to track reset:", error)
  }
}

/**
 * - 检查并自动启用无 HWID 模式 - \\
 * - check and auto-enable hwid less - \\
 * @param {Client} client - discord client
 * @returns {Promise<void>}
 */
async function check_and_enable_hwid_less(client: Client): Promise<void> {
  try {
    const cached_count = await get_cached_reset_count()

    let reset_count: number

    if (cached_count !== null) {
      reset_count = cached_count
      console.log(`[ - HWID RESET TRACKER - ] Using cached reset count: ${reset_count}/${__reset_threshold}`)
    } else {
      const one_minute_ago = Date.now() - 60000

      const recent_resets = await db.find_many<hwid_reset_request>(__hwid_reset_tracker, {
        timestamp: { $gte: one_minute_ago },
      })

      reset_count = recent_resets.length

      await save_reset_count_cache(reset_count)

      console.log(`[ - HWID RESET TRACKER - ] Resets in last minute: ${reset_count}/${__reset_threshold}`)
    }

    if (reset_count >= __reset_threshold) {
      if (__auto_hwid_less_lock) {
        console.log("[ - HWID RESET TRACKER - ] Auto HWID less already processing")
      } else {
        __auto_hwid_less_lock = true

        try {
          const existing_status = await db.find_one<hwid_less_status>(
            __hwid_less_status_collection,
            {
              status_key : __hwid_less_status_key,
              enabled    : true,
              expires_at : { $gt: Date.now() },
            }
          )

          if (existing_status) {
            console.log("[ - HWID RESET TRACKER - ] HWID less already enabled")

            if (
              !__auto_disable_timer ||
              __auto_disable_expires_at !== existing_status.expires_at
            ) {
              schedule_auto_disable(client, existing_status.expires_at)
            }
          } else {
            const enable_result = await luarmor.update_project_settings(__project_id, true)

            if (enable_result.success) {
              const now = Date.now()
              const expires_at = now + __hwid_less_duration_ms

              await db.update_one<hwid_less_status>(
                __hwid_less_status_collection,
                { status_key: __hwid_less_status_key },
                {
                  status_key          : __hwid_less_status_key,
                  enabled             : true,
                  enabled_at          : now,
                  expires_at          : expires_at,
                  triggered_by        : "auto",
                  reset_count         : reset_count,
                  disabled_at         : null,
                  disable_notified_at : null,
                },
                true
              )

              console.log(`[ - HWID RESET TRACKER - ] Auto-enabled HWID less for 1 hour (${reset_count} requests)`)

              try {
                const notification_user = await client.users.fetch(__notification_user)
                const message = component.build_message({
                  components: [
                    component.container({
                      accent_color: 0xED4245,
                      components: [
                        component.text("## Auto HWID-Less Enabled!"),
                      ],
                    }),
                    component.container({
                      components: [
                        component.text([
                          "## Details:",
                          `- Trigger: **Auto (High Reset Requests)**`,
                          `- Reset Count: **${reset_count} requests in 1 minute**`,
                          `- Threshold: **${__reset_threshold} requests/minute**`,
                          `- Duration: **1 hour**`,
                          `- Expires: <t:${Math.floor(expires_at / 1000)}:R>`,
                          ``,
                          `HWID-less mode has been automatically enabled due to high reset request volume.`,
                        ]),
                      ],
                    }),
                  ],
                })

                await notification_user.send(message)
              } catch (dm_error) {
                console.error("[ - HWID RESET TRACKER - ] Failed to send notification:", dm_error)
              }

              schedule_auto_disable(client, expires_at)
            } else {
              console.error("[ - HWID RESET TRACKER - ] Failed to enable HWID less:", enable_result.error)
            }
          }
        } finally {
          __auto_hwid_less_lock = false
        }
      }
    }

    const old_timestamp = Date.now() - 300000
    await db.delete_many(__hwid_reset_tracker, {
      timestamp: { $lt: old_timestamp },
    })
  } catch (error) {
    console.error("[ - HWID RESET TRACKER - ] Error checking reset count:", error)
  }
}

/**
 * - 定时自动禁用无 HWID 模式 - \\
 * - schedule auto disable hwid less - \\
 * @param {Client} client - discord client
 * @param {number} expires_at - expiration timestamp (ms)
 * @returns {void}
 */
function schedule_auto_disable(client: Client, expires_at: number): void {
  if (__auto_disable_timer) {
    clearTimeout(__auto_disable_timer)
    __auto_disable_timer = null
  }

  __auto_disable_expires_at = expires_at

  const delay_ms = Math.max(expires_at - Date.now(), 0)

  __auto_disable_timer = setTimeout(() => {
    void run_auto_disable(client, expires_at)
  }, delay_ms)
}

/**
 * - 执行自动禁用无 HWID 模式 - \\
 * - run auto disable hwid less - \\
 * @param {Client} client - discord client
 * @param {number} expected_expires_at - expected expiration timestamp (ms)
 * @returns {Promise<void>}
 */
async function run_auto_disable(client: Client, expected_expires_at: number): Promise<void> {
  try {
    const status = await db.find_one<hwid_less_status>(
      __hwid_less_status_collection,
      { status_key: __hwid_less_status_key }
    )

    if (!status || !status.enabled) {
      return
    }

    if (status.expires_at !== expected_expires_at) {
      return
    }

    if (status.expires_at > Date.now()) {
      return
    }

    const disable_result = await luarmor.update_project_settings(__project_id, false)
    if (!disable_result.success) {
      console.error("[ - HWID RESET TRACKER - ] Failed to auto-disable HWID less:", disable_result.error)
      return
    }

    const now = Date.now()
    const updated = await db.update_one<hwid_less_status>(
      __hwid_less_status_collection,
      {
        status_key : __hwid_less_status_key,
        enabled    : true,
        expires_at : expected_expires_at,
      },
      {
        enabled             : false,
        disabled_at         : now,
        disable_notified_at : now,
      }
    )

    if (!updated) {
      return
    }

    console.log("[ - HWID RESET TRACKER - ] Auto-disabled HWID less after 1 hour")

    try {
      const notification_user = await client.users.fetch(__notification_user)
      const message = component.build_message({
        components: [
          component.container({
            accent_color: 0x57F287,
            components: [
              component.text("## Auto HWID-Less Disabled!"),
            ],
          }),
          component.container({
            components: [
              component.text([
                "HWID-less mode has been automatically disabled after 1 hour.",
                "",
                "Normal HWID protection is now re-enabled.",
              ]),
            ],
          }),
        ],
      })

      await notification_user.send(message)
    } catch (dm_error) {
      console.error("[ - HWID RESET TRACKER - ] Failed to send disable notification:", dm_error)
    }
  } catch (error) {
    console.error("[ - HWID RESET TRACKER - ] Failed to auto-disable HWID less:", error)
  } finally {
    if (__auto_disable_expires_at === expected_expires_at) {
      __auto_disable_expires_at = null
      __auto_disable_timer = null
    }
  }
}

/**
 * - 带缓存回退获取用户 - \\
 * - get user with cache fallback - \\
 * @param {string} user_id - discord user ID
 * @param {Client} client - discord client
 * @returns {Promise<object>} result with user data
 */
async function get_user_with_cache(user_id: string, client: Client): Promise<{ success: boolean; data?: luarmor.luarmor_user; error?: string; from_cache?: boolean }> {
  const cached = await get_cached_user(user_id)

  if (cached) {
    console.log(`[ - SERVICE PROVIDER CACHE - ] Returning cached data for user_id: ${user_id}`)
    return {
      success    : true,
      data       : cached,
      from_cache : true,
    }
  }

  console.log(`[ - SERVICE PROVIDER CACHE - ] Fetching from Luarmor for user_id: ${user_id}`)
  const user_result = await luarmor.get_user_by_discord(user_id)

  if (user_result.success && user_result.data) {
    await save_cached_user(user_id, user_result.data)
    return {
      success    : true,
      data       : user_result.data,
      from_cache : false,
    }
  }

  return {
    success : false,
    error   : user_result.error,
  }
}

/**
 * - 获取用户脚本 - \\
 * - get user script - \\
 * @param {object} options - options containing client and user_id
 * @returns {Promise<object>} result with script or error
 */
export async function get_user_script(options: { client: Client; user_id: string }): Promise<{ success: boolean; script?: string; error?: string; message?: any }> {
  try {
    const user_result = await get_user_with_cache(options.user_id, options.client)

    if (!user_result.success || !user_result.data) {
      if (is_rate_limited(user_result.error)) {
        console.warn(`[ - GET SCRIPT - ] Rate limited for user ${options.user_id}`)
        return {
          success : false,
          message : create_rate_limit_message("Get Script"),
        }
      }

      if (is_user_not_found(user_result.error)) {
        console.warn(`[ - GET SCRIPT - ] User not found for ${options.user_id}`)
        return {
          success : false,
          message : component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## No Key Found",
                    "You do not have a key linked to your Discord account.",
                    "",
                    "Please use **Redeem Key** or **Get Script** first.",
                  ]),
                ],
              }),
            ],
          }),
        }
      }

      console.error(`[ - GET SCRIPT - ] Failed for user ${options.user_id}:`, user_result.error)

      return {
        success : false,
        error   : user_result.error || "User not found",
      }
    }

    const loader_script = luarmor.get_full_loader_script(user_result.data.user_key)

    console.log(`[ - GET SCRIPT - ] Success for user ${options.user_id}`)

    return {
      success : true,
      script  : loader_script,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "get_user_script", {
      user_id : options.user_id,
    })
    return {
      success : false,
      error   : "Failed to get script",
    }
  }
}

/**
 * - 重置用户 HWID - \\
 * - reset user hwid - \\
 * @param {object} options - options containing client and user_id
 * @returns {Promise<object>} result with success status
 */
export async function reset_user_hwid(options: { client: Client; user_id: string }): Promise<{ success: boolean; message?: any; error?: string }> {
  try {
    const reset_result = await luarmor.reset_hwid_by_discord(options.user_id)

    if (reset_result.success) {
      console.log(`[ - RESET HWID - ] Success for user ${options.user_id}`)
      track_and_check_hwid_reset(options.client, options.user_id)
      return { 
        success : true, 
        message : "HWID reset successfully" 
      }
    }

    if (is_rate_limited(reset_result.error)) {
      console.warn(`[ - RESET HWID - ] Rate limited for user ${options.user_id}`)
      return { 
        success : false, 
        message : create_rate_limit_message("HWID Reset") 
      }
    }

    console.error(`[ - RESET HWID - ] Failed for user ${options.user_id}:`, reset_result.error)

    return { 
      success : false, 
      error   : reset_result.error || "Failed to reset HWID" 
    }
  } catch (error) {
    console.error(`[ - RESET HWID - ] Exception for user ${options.user_id}:`, error)
    return { 
      success : false, 
      error   : "Failed to reset HWID" 
    }
  }
}

/**
 * - 获取用户统计数据 - \\
 * - get user stats - \\
 * @param {object} options - options containing client and user_id
 * @returns {Promise<object>} result with user stats and leaderboard
 */
export async function get_user_stats(options: { client: Client; user_id: string }): Promise<{ success: boolean; data?: any; error?: string; message?: any }> {
  try {
    const user_result = await get_user_with_cache(options.user_id, options.client)

    if (!user_result.success || !user_result.data) {
      if (is_user_not_found(user_result.error)) {
        console.warn(`[ - GET STATS - ] User not found for ${options.user_id}`)
        return {
          success : false,
          message : component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## No Key Found",
                    "You do not have a key linked to your Discord account.",
                    "",
                    "Please use **Get Script** first, then try again.",
                  ]),
                ],
              }),
            ],
          }),
        }
      }

      console.error(`[ - GET STATS - ] Failed for user ${options.user_id}:`, user_result.error)
      return {
        success : false,
        error   : user_result.error || "User not found",
      }
    }

    const all_users_result = await luarmor.get_all_users()
    let leaderboard_text   = "Unable to fetch leaderboard"

    if (all_users_result.success && all_users_result.data) {
      const rank_info = luarmor.get_execution_rank(all_users_result.data, options.user_id)
      if (rank_info.rank > 0) {
        leaderboard_text = `You are #${rank_info.rank} of ${rank_info.total} users`
      } else {
        leaderboard_text = `Not ranked yet (${all_users_result.data.length} total users)`
      }
    } else {
      console.warn(`[ - GET STATS - ] Failed to fetch leaderboard for ${options.user_id}:`, all_users_result.error)
    }

    console.log(`[ - GET STATS - ] Success for user ${options.user_id}`)

    return {
      success : true,
      data    : {
        user             : user_result.data,
        leaderboard_text : leaderboard_text,
      },
    }
  } catch (error) {
    await log_error(options.client, error as Error, "get_user_stats", {
      user_id : options.user_id,
    })
    return {
      success : false,
      error   : "Failed to get stats",
    }
  }
}

/**
 * - 兑换用户密钥 - \\
 * - redeem user key - \\
 * @param {object} options - options containing client, user_id, and user_key
 * @returns {Promise<object>} result with success status and script
 */
export async function redeem_user_key(options: { client: Client; user_id: string; user_key: string }): Promise<{ success: boolean; message?: string; error?: string; script?: string }> {
  try {
    const existing_user = await luarmor.get_user_by_discord(options.user_id)

    if (existing_user.success && existing_user.data) {
      console.warn(`[ - REDEEM KEY - ] User ${options.user_id} already has a key`)
      return {
        success : false,
        error   : "You already have a key linked to your Discord account",
      }
    }

    const verify_result = await luarmor.get_user_by_key(options.user_key)

    if (!verify_result.success || !verify_result.data) {
      console.error(`[ - REDEEM KEY - ] Invalid key for user ${options.user_id}`)
      return {
        success : false,
        error   : "Invalid key or key does not exist",
      }
    }

    if (verify_result.data.discord_id && verify_result.data.discord_id !== options.user_id) {
      console.warn(`[ - REDEEM KEY - ] Key ${options.user_key} already linked to another user`)
      return {
        success : false,
        error   : "This key is already linked to another Discord account",
      }
    }

    const link_result = await luarmor.link_discord(options.user_key, options.user_id)

    if (link_result.success) {
      console.log(`[ - REDEEM KEY - ] Successfully linked key for user ${options.user_id}`)

      if (verify_result.data) {
        await save_cached_user(options.user_id, verify_result.data)
      }

      const loader_script = luarmor.get_full_loader_script(options.user_key)
      return {
        success : true,
        message : "Key linked successfully",
        script  : loader_script,
      }
    } else {
      console.error(`[ - REDEEM KEY - ] Failed to link key for user ${options.user_id}:`, link_result.error)
      return {
        success : false,
        error   : link_result.error || "Failed to link key",
      }
    }
  } catch (error) {
    await log_error(options.client, error as Error, "redeem_user_key", {
      user_id  : options.user_id,
      user_key : options.user_key,
    })
    return {
      success : false,
      error   : "Failed to redeem key",
    }
  }
}

/**
 * - 追踪并检查 HWID 重置 - \\
 * - track and check hwid reset - \\
 * @param {Client} client - discord client
 * @param {string} user_id - discord user ID
 * @returns {Promise<void>}
 */
export async function track_and_check_hwid_reset(client: Client, user_id: string): Promise<void> {
  await track_hwid_reset(user_id)
  await check_and_enable_hwid_less(client)
}

/**
 * - 获取执行次数排行榜 - \\
 * - get execution leaderboard - \\
 * @param {object} options - options containing client
 * @returns {Promise<object>} result with leaderboard data
 */
export async function get_execution_leaderboard(options: { client: Client }): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const all_users = await luarmor.get_all_users()

    if (!all_users.success || !all_users.data) {
      return {
        success : false,
        error   : all_users.error || "Failed to fetch users",
      }
    }

    const sorted = all_users.data.sort((a: any, b: any) => b.total_executions - a.total_executions)

    return {
      success : true,
      data    : sorted,
    }
  } catch (error) {
    await log_error(options.client, error as Error, "get_execution_leaderboard", {})
    return {
      success : false,
      error   : "Failed to fetch leaderboard",
    }
  }
}
