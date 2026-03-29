/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Message, Client } from "discord.js"
import { bypass_link }    from "@bypass/modules/bypass/services/bypass.service"
import { component, db, guild_settings } from "@shared/utils"
import { log_error }                     from "@shared/utils/error_logger"
import { check_bypass_rate_limit, check_dm_user_cooldown } from "@bypass/modules/bypass/middleware/bypass_rate_limit.middleware"

const __session_key = (msg_id: string) => `bypass_session_${msg_id}`

/**
 * @description persist a processing session to DB so it can be recovered on restart
 * @param msg_id - Processing message ID
 * @param channel_id - Channel where the message was sent
 */
async function track_bypass_session(msg_id: string, channel_id: string): Promise<void> {
  if (!db.is_connected()) return
  await db.get_pool().query(
    `INSERT INTO bypass_cache (key, url, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 hours')
     ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '2 hours'`,
    [__session_key(msg_id), channel_id]
  ).catch((err: unknown) => console.error(`[ - AUTO BYPASS - ] Failed to track session:`, err))
}

/**
 * @description remove a processing session from DB when bypass completes
 * @param msg_id - Processing message ID
 */
async function clear_bypass_session(msg_id: string): Promise<void> {
  if (!db.is_connected()) return
  await db.get_pool().query(
    `DELETE FROM bypass_cache WHERE key = $1`,
    [__session_key(msg_id)]
  ).catch((err: unknown) => console.error(`[ - AUTO BYPASS - ] Failed to clear session:`, err))
}

/**
 * @description on bot startup: find all stuck "Bypassing Link" messages and update them
 * @param {Client} client - discord client
 * @returns {Promise<void>}
 */
export async function recover_stuck_bypass_sessions(client: Client): Promise<void> {
  if (!db.is_connected()) return

  const result = await db.get_pool().query(
    `SELECT key, url FROM bypass_cache WHERE key LIKE 'bypass_session_%' AND expires_at > NOW()`
  ).catch(() => null)

  if (!result || result.rows.length === 0) return

  console.warn(`[ - AUTO BYPASS - ] Recovering ${result.rows.length} stuck session(s)...`)

  const stuck_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            "## Bot Restarted",
            "The bot was restarted while processing your bypass.",
            "Please resend your link to try again.",
          ]),
        ],
      }),
    ],
  })

  for (const row of result.rows) {
    const msg_id     = (row.key as string).replace("bypass_session_", "")
    const channel_id = row.url as string

    try {
      const channel = await client.channels.fetch(channel_id).catch(() => null)
      if (!channel || !channel.isTextBased()) continue

      const msg = await (channel as any).messages.fetch(msg_id).catch(() => null)
      if (!msg) continue

      await msg.edit(stuck_message).catch(() => {})
    } catch (err) {
      console.warn(`[ - AUTO BYPASS - ] Failed to recover session ${msg_id}:`, err)
    }

    await db.get_pool().query(
      `DELETE FROM bypass_cache WHERE key = $1`,
      [row.key]
    ).catch(() => {})
  }

  console.warn(`[ - AUTO BYPASS - ] Session recovery complete`)
}

/**
 * @param {Message} message - discord message
 * @returns {string | null} extracted URL if found
 */
function extract_url_from_message(message: Message): string | null {
  const content = message.content?.trim() ?? ""
  if (content.length > 0) {
    const match = content.match(/https?:\/\/[^\s<>]+/i)
    if (match) return match[0]
  }

  for (const embed of message.embeds) {
    if (embed.url && embed.url.startsWith("http")) return embed.url

    const description = embed.description ?? ""
    const desc_match  = description.match(/https?:\/\/[^\s<>]+/i)
    if (desc_match) return desc_match[0]

    const title = embed.title ?? ""
    const title_match = title.match(/https?:\/\/[^\s<>]+/i)
    if (title_match) return title_match[0]

    for (const field of embed.fields) {
      const field_match = field.value.match(/https?:\/\/[^\s<>]+/i)
      if (field_match) return field_match[0]
    }
  }

  return null
}

/**
 * - 自动绕过处理器 - \\
 * - auto bypass handler - \\
 * 
 * @param {Message} message - discord message
 * @returns {Promise<boolean>} true if message was handled
 */
export async function handle_auto_bypass(message: Message): Promise<boolean> {
  // - 获取部分消息/频道以写入内容 - \\
  // - fetch partial message/channel to get content - \\
  if (message.partial) {
    try {
      message = await message.fetch()
    } catch (err) {
      console.error(`[ - AUTO BYPASS - ] Failed to fetch partial message:`, err)
      return false
    }
  }

  const is_dm    = message.channel.isDMBased()
  const guild_id = message.guildId

  console.warn(`[ - AUTO BYPASS - ] Message received - DM: ${is_dm}, Guild: ${guild_id || "N/A"}, Channel: ${message.channelId}`)

  if (!is_dm) {
    if (!guild_id) {
      console.warn(`[ - AUTO BYPASS - ] No guild ID, skipping`)
      return false
    }

    const settings          = await guild_settings.get_all_guild_settings(guild_id)
    const bypass_channel_id = settings?.bypass_channel || null

    console.warn(`[ - AUTO BYPASS - ] Bypass channel for guild ${guild_id}: ${bypass_channel_id || "NOT SET"}`)
    
    if (!bypass_channel_id) {
      console.warn(`[ - AUTO BYPASS - ] No bypass channel configured for guild ${guild_id}`)
      return false
    }

    if (message.channelId !== bypass_channel_id) {
      console.warn(`[ - AUTO BYPASS - ] Message not in bypass channel (${message.channelId} !== ${bypass_channel_id})`)
      return false
    }
  }

  const url = extract_url_from_message(message)
  console.warn(`[ - AUTO BYPASS - ] Extracted URL: ${url || "NONE"}`)
  console.warn(`[ - AUTO BYPASS - ] Message content length: ${message.content?.length || 0}`)
  console.warn(`[ - AUTO BYPASS - ] Message embeds: ${message.embeds.length}`)
  
  if (!url) {
    console.warn(`[ - AUTO BYPASS - ] No URL found in message`)
    return false
  }

  if (!is_dm && guild_id) {
    const settings = await guild_settings.get_all_guild_settings(guild_id)
    if (settings?.bypass_enabled === "false") {
      const maintenance_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Under Maintenance",
                "",
                `Reason: ${settings.bypass_disabled_reason || "No reason provided"}`,
              ]),
            ],
          }),
        ],
      })

      await message.reply(maintenance_message)
      return true
    }
  }

  let processing_msg: Awaited<ReturnType<typeof message.reply>> | null = null

  // - DM 防刷板：每用户每 2 秒 1 次请求，静默丢弃以避免机器人账号被隔离 - \\
  // - dm anti-spam: 1 request per 2 seconds per user — silent drop to avoid bot quarantine - \\
  if (is_dm) {
    const cooldown = check_dm_user_cooldown(message.author.id)
    if (!cooldown.allowed) {
      console.warn(`[ - AUTO BYPASS - ] DM spam drop for ${message.author.id} (retry_after: ${cooldown.retry_after_ms}ms)`)
      return true
    }
  }

  try {
    const client_id   = message.client.user?.id || ""
    const invite_url   = client_id
      ? `https://discord.com/oauth2/authorize?client_id=${client_id}&permissions=4503599694556160&integration_type=0&scope=bot`
      : "https://discord.com/oauth2/authorize"

    const dm_auth_url  = client_id
      ? `https://discord.com/oauth2/authorize?client_id=${client_id}&scope=applications.commands&integration_type=1`
      : invite_url

    if (!is_dm && message.guildId) {
      const rate_limit = check_bypass_rate_limit(message.guildId)
      if (!rate_limit.allowed) {
        const wait_seconds = Math.max(1, Math.ceil((rate_limit.reset_at - Date.now()) / 1000))
        const rate_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Rate Limit Reached",
                  "",
                  `Please wait ${wait_seconds}s before trying again.`,
                ]),
              ],
            }),
          ],
        })

        await message.reply(rate_message)
        return true
      }
    }

    processing_msg = await message.reply(
      component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "## <a:GTA_Loading:1459707117840629832> - Bypassing Link\nHang on! We're processing your bypass.\n",
                accessory : component.link_button("DM when Done", dm_auth_url),
              }),
            ],
          }),
        ],
      })
    )

    // - 将会话记录到数据库以便重启后恢复 - \\
    // - track session in db so restart can recover it - \\
    await track_bypass_session(processing_msg.id, processing_msg.channelId)

    const source = is_dm ? "DM" : "Channel"
    console.warn(`[ - AUTO BYPASS - ] Processing URL from ${source}: ${url}`)
    const result = await bypass_link(url, async (attempt, _wait_ms, is_processing) => {
      // - 服务器仍在处理中则跳过重试消息 - \\
      // - skip retry message if server is still processing - \\
      if (!processing_msg || is_processing) return
      try {
        await processing_msg.edit(
          component.build_message({
            components: [
              component.container({
                components: [
                  component.section({
                    content   : `## <a:GTA_Loading:1459707117840629832> - Bypassing Link\nHang on! We're processing your bypass. (Retry ${attempt}/3)\n`,
                    accessory : component.link_button("DM when Done", dm_auth_url),
                  }),
                ],
              }),
            ],
          })
        )
      } catch (err) {
        console.warn(`[ - AUTO BYPASS - ] Failed to edit retry message:`, err)
      }
    })

    // - 每次尝试递增计数 - \\
    // - increment count per attempt - \\
    db.increment_bypass_count().catch(err => console.error(`[ - AUTO BYPASS - ] Failed to increment bypass count:`, err))

    if (result.success && result.result) {
      if (message.guildId) {
        db.insert_bypass_log({
          guild_id   : message.guildId,
          user_id    : message.author.id,
          user_tag   : message.author.tag,
          avatar     : message.author.avatar,
          url        : url,
          result_url : result.result,
          success    : true,
        }).catch(err => console.error(`[ - AUTO BYPASS - ] Failed to insert log:`, err))
      }

      // - 记录每个服务器的绕过统计 - \\
      // - record per-guild bypass stat - \\
      if (message.guildId) {
        db.record_bypass_guild_stat(message.guildId).catch(
          err => console.error(`[ - AUTO BYPASS - ] Failed to record guild stat:`, err)
        )
      }

      // - 存入数据库 - \\
      // - store in database - \\
      const cache_key = `bypass_result_${message.id}`

      try {
        await db.get_pool().query(
          `INSERT INTO bypass_cache (key, url, expires_at) 
           VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
           ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '5 minutes'`,
          [cache_key, result.result]
        )
        console.warn(`[ - AUTO BYPASS - ] Stored result with key: ${cache_key}`)
      } catch (db_error) {
        console.error(`[ - AUTO BYPASS - ] Failed to store in database:`, db_error)
      }

      const success_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "## <:checkmark:1417196825110253780> - Bypass Completed\nYour bypass was completed successfully. Use /bypass or send a link to start another bypass.\n",
                thumbnail : "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
              }),
            ],
          }),
          component.container({
            components: [
              component.text(`## <:rbx:1447976733050667061> - Desktop Copy\n\`\`\`\n${result.result}\n\`\`\``),
              component.divider(2),
              component.section({
                content   : `Completed in ${result.time}s • Requested by <@${message.author.id}> `,
                accessory : component.secondary_button(
                  "Mobile Copy",
                  `bypass_mobile_copy:${message.author.id}:${message.id}`
                ),
              }),
            ],
          }),
          component.container({
            components: [
              component.section({
                content   : "Want to invite the bot to your server? Click here →\n",
                accessory : component.link_button("Invite BOT", invite_url),
              }),
            ],
          }),
        ],
      })

      try {
        await processing_msg.edit(success_message)
        console.warn(`[ - AUTO BYPASS - ] Success!`)
      } catch (err) {
        console.error(`[ - AUTO BYPASS - ] Failed to edit success message:`, err)
      }

      await clear_bypass_session(processing_msg.id)

      // - 仅当请求来自服务器时才向用户发送 DM（避免在 DM 中重复发送） - \\
      // - dm user only if request came from guild (avoid double dm in dm context) - \\
      if (!is_dm) {
        try {
          await message.author.send(success_message)
          console.warn(`[ - AUTO BYPASS - ] DM sent to ${message.author.tag}`)
        } catch {
          // - 用户未授权或已关闭 DM，静默跳过 - \\
          // - user has not authorized or has DMs disabled, skip silently - \\
        }
      }
    } else {
      if (message.guildId) {
        db.insert_bypass_log({
          guild_id   : message.guildId,
          user_id    : message.author.id,
          user_tag   : message.author.tag,
          avatar     : message.author.avatar,
          url        : url,
          result_url : null,
          success    : false,
        }).catch(err => console.error(`[ - AUTO BYPASS - ] Failed to insert log:`, err))
      }

      const log_text = [
        `[ BYPASS ] - Bypassing Link`,
        `URL      : ${url}`,
        `User     : ${message.author.tag} (${message.author.id})`,
        `Channel  : ${message.channelId}`,
        `Guild    : ${message.guild?.name || "DM"}`,
        `Source   : ${is_dm ? "DM" : "Channel"}`,
        `Time     : ${new Date().toISOString()}`,
        ``,
        `[ BYPASS ] - Error Expected:`,
        `${result.error || "Unknown error"}`,
        `Attempts : ${result.attempts ?? "N/A"}`,
      ].join("\n")

      try {
        await db.get_pool().query(
          `INSERT INTO bypass_cache (key, url, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 hour')
           ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '1 hour'`,
          [`bypass_log_${message.id}`, log_text]
        )
      } catch (db_err) {
        console.error(`[ - AUTO BYPASS - ] Failed to store log:`, db_err)
      }

      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Bypass Failed !"),
            ],
          }),
          component.container({
            components: [
              component.section({
                content   : result.error || "Unknown error occurred",
                accessory : component.secondary_button("View Request Log", `bypass_request_log:${message.id}`),
              }),
            ],
          }),
        ],
      })

      try {
        await processing_msg.edit(error_message)
        console.warn(`[ - AUTO BYPASS - ] Failed: ${result.error}`)
      } catch (err) {
        console.error(`[ - AUTO BYPASS - ] Failed to edit error message:`, err)
      }

      await clear_bypass_session(processing_msg.id)
    }

    return true
  } catch (error) {
    // - Discord DM 频率限制：跳过 log_error，这不是机器人 bug - \\
    // - Discord DM rate limit: skip log_error, not a bot bug - \\
    const err_code = (error as any)?.code
    if (err_code === 340002 || err_code === 50007) {
      console.warn(`[ - AUTO BYPASS - ] DM restricted for ${message.author.tag} (code: ${err_code}), skipping.`)
      return false
    }

    if (message.guildId && !is_dm) {
      db.insert_bypass_log({
        guild_id   : message.guildId,
        user_id    : message.author.id,
        user_tag   : message.author.tag,
        avatar     : message.author.avatar,
        url        : url || "unknown",
        result_url : null,
        success    : false,
      }).catch(err => console.error(`[ - AUTO BYPASS - ] Failed to insert catch log:`, err))
    }

    console.error("[ - AUTO BYPASS - ] Error:", error)
    await log_error(message.client, error as Error, "Auto Bypass", {
      channel : message.channelId,
      guild   : message.guild?.name || "DM",
      user    : message.author.tag,
      url     : url || "unknown",
    })

    // - 始终更新处理消息以避免卡死 - \\
    // - always update processing message to avoid stuck state - \\
    if (processing_msg) {
      try {
        const stuck_log_text = [
          `[ BYPASS ] - Bypassing Link`,
          `URL      : ${url || "unknown"}`,
          `User     : ${message.author.tag} (${message.author.id})`,
          `Channel  : ${message.channelId}`,
          `Guild    : ${message.guild?.name || "DM"}`,
          `Source   : ${is_dm ? "DM" : "Channel"}`,
          `Time     : ${new Date().toISOString()}`,
          ``,
          `[ BYPASS ] - Error Expected:`,
          `${(error as Error)?.message || String(error)}`,
        ].join("\n")

        await db.get_pool().query(
          `INSERT INTO bypass_cache (key, url, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 hour')
           ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '1 hour'`,
          [`bypass_log_${message.id}`, stuck_log_text]
        ).catch((db_err: unknown) => console.error(`[ - AUTO BYPASS - ] Failed to store stuck log:`, db_err))

        const stuck_error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text("## Bypass Failed !"),
              ],
            }),
            component.container({
              components: [
                component.section({
                  content   : "An unexpected error occurred while processing your request. Please try again.",
                  accessory : component.secondary_button("View Request Log", `bypass_request_log:${message.id}`),
                }),
              ],
            }),
          ],
        })
        await processing_msg.edit(stuck_error_message)
      } catch (edit_error) {
        console.error("[ - AUTO BYPASS - ] Failed to edit processing message:", edit_error)
      }

      await clear_bypass_session(processing_msg.id)
    }

    return false
  }
}
