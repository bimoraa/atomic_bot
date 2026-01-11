import { ButtonInteraction } from "discord.js"
import { component, cache }  from "../../../../shared/utils"
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

    // - GET CACHED RESULT - \\
    const cache_key    = `bypass_result_${interaction_id}`
    const bypass_url   = cache.get<string>(cache_key)

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
