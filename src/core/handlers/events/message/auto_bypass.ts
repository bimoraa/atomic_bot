import { Message } from "discord.js"
import { bypass_link } from "../../shared/controller/bypass_controller"
import { component, db } from "../../../../shared/utils"

const BYPASS_CHANNEL_ID = "1459729966974505086"

/**
 * - AUTO BYPASS HANDLER - \\
 * 
 * @param {Message} message - Discord message
 * @returns {Promise<boolean>} True if message was handled
 */
export async function handle_auto_bypass(message: Message): Promise<boolean> {
  const is_bypass_channel = message.channelId === BYPASS_CHANNEL_ID
  const is_dm             = message.channel.isDMBased()
  
  if (!is_bypass_channel && !is_dm) return false
  if (!message.content.includes("https://")) return false

  const url_match = message.content.match(/https?:\/\/[^\s]+/)
  if (!url_match) return false

  const url = url_match[0]

  try {
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
              component.text(["## Bypass Success!"]),
              component.divider(2),
              component.section({
                content   : `##  Desktop Copy:\n\`\`\`\n${result.result}\n\`\`\``,
                thumbnail : "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
              }),
              component.divider(2),
              component.text([`Processed in ${result.time}s`]),
              component.divider(1),
              component.action_row(
                component.secondary_button(
                  "Mobile Copy (See Result)",
                  `bypass_mobile_copy:${message.id}`
                )
              ),
            ],
          }),
        ],
      })

      await processing_msg.edit(success_message)
      console.log(`[ - AUTO BYPASS - ] Success!`)
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
