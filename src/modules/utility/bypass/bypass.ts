import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "../../../shared/types/command"
import { bypass_link } from "../../../core/handlers/shared/controller/bypass_controller"
import * as component from "../../../shared/utils/components"
import { api } from "../../../shared/utils"

/**
 * - BYPASS LINK COMMAND - \\
 */
const bypass_command: Command = {
  data: new SlashCommandBuilder()
    .setName("bypass")
    .setDescription("Bypass link protection services")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The URL to bypass")
        .setRequired(true)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      await interaction.deferReply({ ephemeral: true })

      const url = interaction.options.getString("url", true)

      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## <:lcok:1417196069716234341> Invalid URL",
                  "",
                  "Please provide a valid URL starting with `http://` or `https://`",
                ]),
              ],
            }),
          ],
        })

        await api.edit_deferred_reply(interaction, error_message)
        return
      }

      const processing_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## <a:GTA_Loading:1459707117840629832> Processing...",
                "",
                "Bypassing link, please wait...",
              ]),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, processing_message)

      const result = await bypass_link(url)

      console.log(`[ - BYPASS COMMAND - ] Bypass result:`, JSON.stringify(result))

      if (!result.success || !result.result) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## <:lcok:1417196069716234341> Bypass Failed",
                  "",
                  `**Error:** ${result.error || "Unknown error occurred"}`,
                  "",
                  `**URL:** ${url}`,
                ]),
              ],
            }),
          ],
        })

        await api.edit_deferred_reply(interaction, error_message)
        return
      }

      const success_components = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## <:checkmark:1417196825110253780> Bypass Success!"),
              component.divider(2),
              component.text(`##  Desktop Copy:\n\`\`\`\n${result.result}\n\`\`\``),
              component.divider(2),
              component.text(`Processed in ${result.time}s`),
              component.divider(1),
              component.action_row(
                component.secondary_button(
                  "Mobile Copy (See Result)",
                  `bypass_mobile_copy:${interaction.user.id}:${result.result}`
                )
              ),
            ],
          }),
        ],
      })

      console.log(`[ - BYPASS COMMAND - ] Sending success message...`)
      const send_result = await api.edit_deferred_reply(interaction, success_components)
      
      if (send_result.error) {
        console.error(`[ - BYPASS COMMAND - ] Failed to send success message:`, JSON.stringify(send_result))
        throw new Error(`Failed to send message: ${JSON.stringify(send_result)}`)
      }
      
      console.log(`[ - BYPASS COMMAND - ] Success message sent!`)

    } catch (error: any) {
      console.error(`[ - BYPASS COMMAND - ] Error:`, error)
      
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## <:lcok:1417196069716234341> Error",
                "",
                "An error occurred while processing your request",
              ]),
            ],
          }),
        ],
      })

      try {
        await api.edit_deferred_reply(interaction, error_message)
      } catch (edit_error) {
        console.error(`[ - BYPASS COMMAND - ] Failed to send error message:`, edit_error)
      }
    }
  },
}

export default bypass_command
