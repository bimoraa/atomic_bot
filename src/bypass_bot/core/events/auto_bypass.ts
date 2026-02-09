import { Message } from "discord.js"
import { bypass_link } from "@shared/services/bypass_service"
import { component, db, guild_settings } from "@shared/utils"
import { check_bypass_rate_limit } from "../limits/bypass_rate_limit"

/**
 * - AUTO BYPASS HANDLER - \\
 * 
 * @param {Message} message - Discord message
 * @returns {Promise<boolean>} True if message was handled
 */
export async function handle_auto_bypass(message: Message): Promise<boolean> {
  const is_dm             = message.channel.isDMBased()

  if (!is_dm) {
    const guild_id = message.guildId
    if (!guild_id) return false

    const bypass_channel_id = await guild_settings.get_guild_setting(guild_id, "bypass_channel")
    if (!bypass_channel_id || message.channelId !== bypass_channel_id) return false
  }

  if (!message.content.includes("https://")) return false

  const url_match = message.content.match(/https?:\/\/[^\s]+/)
  if (!url_match) return false

  const url = url_match[0]

  try {
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
              component.text(["<a:GTA_Loading:1459707117840629832> Bypassing link..."]),
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
                content   : "## <:checkmark:1417196825110253780> Bypass Completed Successfully\nThe bypass process has finished successfully. Use `/bypass` or send a link to bypass.",
                thumbnail : "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
              }),
            ],
          }),
          component.container({
            components: [
              component.text(`## <:rbx:1447976733050667061> Desktop Copy:\n\`\`\`\n${result.result}\n\`\`\``),
              component.divider(2),
              component.section({
                content   : `Completed in ${result.time}s • Requested by <@${message.author.id}>`,
                accessory : component.secondary_button(
                  "Mobile Copy",
                  `bypass_mobile_copy:${message.id}`
                ),
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
    return false
  }
}
