import { Message } from "discord.js"
import { bypass_link } from "@shared/services/bypass_service"
import { component, db, guild_settings } from "@shared/utils"
import { log_error }                     from "@shared/utils/error_logger"
import { check_bypass_rate_limit, check_dm_user_cooldown } from "../limits/bypass_rate_limit"

/**
 * @param {Message} message - Discord message
 * @returns {string | null} Extracted URL if found
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
 * - AUTO BYPASS HANDLER - \\
 * 
 * @param {Message} message - Discord message
 * @returns {Promise<boolean>} True if message was handled
 */
export async function handle_auto_bypass(message: Message): Promise<boolean> {
  // - FETCH PARTIAL MESSAGE/CHANNEL TO GET CONTENT - \\
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

  // - DM ANTI-SPAM: 1 REQUEST PER 2 SECONDS PER USER — SILENT DROP TO AVOID BOT QUARANTINE - \\
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
      ? `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=0&scope=bot%20applications.commands`
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

    const source = is_dm ? "DM" : "Channel"
    console.warn(`[ - AUTO BYPASS - ] Processing URL from ${source}: ${url}`)
    const result = await bypass_link(url, async (attempt, _wait_ms, is_processing) => {
      // - SKIP RETRY MESSAGE IF SERVER IS STILL PROCESSING - \\
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

    // - INCREMENT COUNT PER ATTEMPT - \\
    db.increment_bypass_count().catch(err => console.error(`[ - AUTO BYPASS - ] Failed to increment bypass count:`, err))

    if (result.success && result.result) {
      // - RECORD PER-GUILD BYPASS STAT - \\
      if (message.guildId) {
        db.record_bypass_guild_stat(message.guildId).catch(
          err => console.error(`[ - AUTO BYPASS - ] Failed to record guild stat:`, err)
        )
      }

      // - STORE IN DATABASE - \\
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

      // - DM USER ONLY IF REQUEST CAME FROM GUILD (AVOID DOUBLE DM IN DM CONTEXT) - \\
      if (!is_dm) {
        try {
          await message.author.send(success_message)
          console.warn(`[ - AUTO BYPASS - ] DM sent to ${message.author.tag}`)
        } catch {
          // - USER HAS NOT AUTHORIZED OR HAS DMs DISABLED, SKIP SILENTLY - \\
        }
      }
    } else {
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
    }

    return true
  } catch (error) {
    // - DISCORD DM RATE LIMIT: SKIP LOG_ERROR, NOT A BOT BUG - \\
    const err_code = (error as any)?.code
    if (err_code === 340002 || err_code === 50007) {
      console.warn(`[ - AUTO BYPASS - ] DM restricted for ${message.author.tag} (code: ${err_code}), skipping.`)
      return false
    }

    console.error("[ - AUTO BYPASS - ] Error:", error)
    await log_error(message.client, error as Error, "Auto Bypass", {
      channel : message.channelId,
      guild   : message.guild?.name || "DM",
      user    : message.author.tag,
      url     : url || "unknown",
    })

    // - ALWAYS UPDATE PROCESSING MESSAGE TO AVOID STUCK STATE - \\
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
    }

    return false
  }
}
