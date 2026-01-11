import { ButtonInteraction } from "discord.js"
import { component, cache, db }  from "../../../../shared/utils"
import { log_error }         from "../../../../shared/utils/error_logger"

/**
 * - HANDLE BYPASS MOBILE COPY BUTTON - \\
 * 
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_bypass_mobile_copy(interaction: ButtonInteraction): Promise<void> {
  try {
    const [, interaction_id] = interaction.customId.split(":")
    console.log(`[ - BYPASS MOBILE - ] Button clicked, custom_id: ${interaction.customId}`)
    console.log(`[ - BYPASS MOBILE - ] Extracted interaction_id: ${interaction_id}`)

    // - GET RESULT FROM DATABASE - \\
    const cache_key = `bypass_result_${interaction_id}`
    console.log(`[ - BYPASS MOBILE - ] Looking for database key: ${cache_key}`)
    
    const result = await db.get_pool().query(
      `SELECT url FROM bypass_cache WHERE key = $1 AND expires_at > NOW()`,
      [cache_key]
    )
    
    const bypass_url = result.rows[0]?.url
    console.log(`[ - BYPASS MOBILE - ] Database result:`, bypass_url ? "FOUND" : "NOT FOUND")

    if (!bypass_url) {
      const expired_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Session Expired",
                "",
                "The bypass result has expired. Please run the command again.",
              ]),
            ],
          }),
        ],
      })

      expired_message.flags = (expired_message.flags ?? 0) | 64

      await interaction.reply(expired_message)
      return
    }

    // - SEND MOBILE-FRIENDLY RESPONSE - \\
    const mobile_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Bypassed URL",
              "",
              "Tap and hold the URL below to copy:",
            ]),
            component.divider(2),
            component.text(`${bypass_url}`),
            component.divider(1),
            component.text("*Session expires in 5 minutes*"),
          ],
        }),
      ],
    })

    mobile_message.flags = (mobile_message.flags ?? 0) | 64

    await interaction.reply(mobile_message)

  } catch (error: any) {
    await log_error(
      interaction.client,
      error as Error,
      "handle_bypass_mobile_copy",
      {
        user_id    : interaction.user.id,
        guild_id   : interaction.guildId,
        channel_id : interaction.channelId,
        custom_id  : interaction.customId,
      }
    )

    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Error",
              "",
              "An error occurred while processing your request.",
            ]),
          ],
        }),
      ],
    })

    error_message.flags = (error_message.flags ?? 0) | 64

    try {
      await interaction.reply(error_message)
    } catch {
      // - IGNORE IF ALREADY REPLIED - \\
    }
  }
}
