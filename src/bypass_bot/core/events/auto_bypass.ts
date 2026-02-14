import { Message } from "discord.js"
import { bypass_link } from "@shared/services/bypass_service"
import { component, db, guild_settings } from "@shared/utils"
import { log_error }                     from "@shared/utils/error_logger"
import { check_bypass_rate_limit } from "../limits/bypass_rate_limit"

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
  const is_dm    = message.channel.isDMBased()
  const guild_id = message.guildId

  console.log(`[ - AUTO BYPASS - ] Message received - DM: ${is_dm}, Guild: ${guild_id || "N/A"}, Channel: ${message.channelId}`)

  if (!is_dm) {
    if (!guild_id) {
      console.log(`[ - AUTO BYPASS - ] No guild ID, skipping`)
      return false
    }

    const settings          = await guild_settings.get_all_guild_settings(guild_id)
    const bypass_channel_id = settings?.bypass_channel || null

    console.log(`[ - AUTO BYPASS - ] Bypass channel for guild ${guild_id}: ${bypass_channel_id || "NOT SET"}`)
    
    if (!bypass_channel_id) {
      console.log(`[ - AUTO BYPASS - ] No bypass channel configured for guild ${guild_id}`)
      return false
    }

    if (message.channelId !== bypass_channel_id) {
      console.log(`[ - AUTO BYPASS - ] Message not in bypass channel (${message.channelId} !== ${bypass_channel_id})`)
      return false
    }
  }

  const url = extract_url_from_message(message)
  console.log(`[ - AUTO BYPASS - ] Extracted URL: ${url || "NONE"}`)
  console.log(`[ - AUTO BYPASS - ] Message content length: ${message.content?.length || 0}`)
  console.log(`[ - AUTO BYPASS - ] Message embeds: ${message.embeds.length}`)
  
  if (!url) {
    console.log(`[ - AUTO BYPASS - ] No URL found in message`)
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

  try {
    const client_id  = message.client.user?.id || ""
    const invite_url = client_id
      ? `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=0&scope=bot%20applications.commands`
      : "https://discord.com/oauth2/authorize"

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

    const processing_msg = await message.reply(
      component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "## <a:GTA_Loading:1459707117840629832> - Bypassing Link\nHang on! We're processing your bypass.\n",
                accessory : component.link_button("Invite BOT", invite_url),
              }),
            ],
          }),
        ],
      })
    )

    const source = is_dm ? "DM" : "Channel"
    console.log(`[ - AUTO BYPASS - ] Processing URL from ${source}: ${url}`)
    const result = await bypass_link(url)

    if (result.success && result.result) {
      // - STORE IN DATABASE - \\
      const cache_key = `bypass_result_${message.id}`
      
      await db.get_pool().query(
        `INSERT INTO bypass_cache (key, url, expires_at) 
         VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
         ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '5 minutes'`,
        [cache_key, result.result]
      )

      console.log(`[ - AUTO BYPASS - ] Stored result with key: ${cache_key}`)

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

      await processing_msg.edit(success_message)
      console.log(`[ - AUTO BYPASS - ] Success!`)

      // - SEND TO DM - \\
      try {
        await message.author.send(success_message)
        console.log(`[ - AUTO BYPASS - ] Sent result to ${message.author.tag}'s DM`)
      } catch (dm_error) {
        console.log(`[ - AUTO BYPASS - ] Could not send DM to ${message.author.tag}`)
      }
    } else {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Bypass Failed",
                "",
                `**Error:** ${result.error || "Unknown error"}`,
                "",
                `**URL:** ${url}`,
              ]),
            ],
          }),
        ],
      })

      await processing_msg.edit(error_message)
      console.log(`[ - AUTO BYPASS - ] Failed: ${result.error}`)
    }

    return true
  } catch (error) {
    console.error("[ - AUTO BYPASS - ] Error:", error)
    await log_error(message.client, error as Error, "Auto Bypass", {
      channel : message.channelId,
      guild   : message.guild?.name || "DM",
      user    : message.author.tag,
      url     : url || "unknown",
    })
    return false
  }
}
