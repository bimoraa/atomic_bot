import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../shared/types/command"
import { component }                                        from "../../shared/utils"
import { log_error }                                        from "../../shared/utils/error_logger"
import { get_currently_live }                               from "../../core/handlers/controllers/idn_live_controller"
import { format_live_component }                            from "../../infrastructure/api/idn_live"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check-on-live")
    .setDescription("Check which JKT48 members are currently live on IDN"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const result = await get_currently_live(interaction.client)

      if (!result.success || !result.data) {
        await interaction.editReply({
          content : result.error || "Failed to fetch live rooms.",
        })
        return
      }

      if (result.data.length === 0) {
        const no_live_message = component.build_message({
          components: [
            component.container({
              accent_color : 0xFEE75C,
              components   : [
                component.text("## No Members Live"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  "No JKT48 members are currently live on IDN.",
                  "",
                  "Use `/notify add` to get notified when your favorite member goes live!",
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(no_live_message)
        return
      }

      const live_components = result.data.slice(0, 5).map((room) => format_live_component(room))

      const header_component = component.container({
        accent_color : 0xFF0000,
        components   : [
          component.text(`## Currently Live (${result.data.length})`),
        ],
      })

      const footer_component = result.data.length > 5
        ? component.container({
            components: [
              component.divider(2),
              component.text(`*Showing 5 of ${result.data.length} live streams*`),
            ],
          })
        : null

      const all_components = [
        header_component,
        ...live_components,
        ...(footer_component ? [footer_component] : []),
      ]

      const live_message = component.build_message({
        components : all_components,
      })

      await interaction.editReply(live_message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "check_on_live_command", {})
      await interaction.editReply({
        content : "An error occurred while checking live streams.",
      }).catch(() => {})
    }
  },
}
