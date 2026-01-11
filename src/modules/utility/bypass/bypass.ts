import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "../../../shared/types/command"
import { bypass_link } from "../../../core/handlers/shared/controller/bypass_controller"
import * as component from "../../../shared/utils/components"
import { api, cache, db } from "../../../shared/utils"

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
      const allowed_channel_id = "1459729966974505086"

      if (interaction.channelId !== allowed_channel_id) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Invalid Channel",
                  "",
                  `This command can only be used in <#${allowed_channel_id}>`,
                ]),
              ],
            }),
          ],
        })

        error_message.flags = (error_message.flags ?? 0) | 64

        await interaction.reply(error_message)
        return
      }

      await interaction.deferReply()

      const url = interaction.options.getString("url", true).trim()

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

      // - STORE RESULT IN DATABASE - \\
      const cache_key = `bypass_result_${interaction.id}`
      
      try {
        await db.get_pool().query(
          `INSERT INTO bypass_cache (key, url, expires_at) 
           VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
           ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '5 minutes'`,
          [cache_key, result.result]
        )
        console.log(`[ - BYPASS - ] Stored in database with key: ${cache_key}`)
      } catch (db_error) {
        console.error(`[ - BYPASS - ] Failed to store in database:`, db_error)
      }
      
      console.log(`[ - BYPASS - ] Button custom_id will be: bypass_mobile_copy:${interaction.id}`)

      const success_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Bypass Success!\n\n"),
              component.divider(2),
              component.section({
                content   : `##  Desktop Copy:\n\`\`\`\n${result.result}\n\`\`\``,
                thumbnail : "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
              }),
              component.divider(2),
              component.text(`Processed in ${result.time}s`),
              component.divider(1),
              component.action_row(
                component.secondary_button(
                  "Mobile Copy (See Result)",
                  `bypass_mobile_copy:${interaction.id}`
                )
              ),
            ],
          }),
        ],
      })

      console.log(`[ - BYPASS COMMAND - ] Sending success message...`)
      const send_result = await api.edit_deferred_reply(interaction, success_message)
      
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
