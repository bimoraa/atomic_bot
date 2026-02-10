import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "@shared/types/command"
import { bypass_link } from "@shared/services/bypass_service"
import * as component from "@shared/utils/components"
import { api, cache, db, guild_settings } from "@shared/utils"
import { check_bypass_rate_limit } from "../core/limits/bypass_rate_limit"

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
      const guild_id = interaction.guildId
      if (!guild_id) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Invalid Context",
                  "",
                  "This command can only be used in a server.",
                ]),
              ],
            }),
          ],
        })

        error_message.flags = (error_message.flags ?? 0) | 64

        await interaction.reply(error_message)
        return
      }

      const allowed_channel_id = await guild_settings.get_guild_setting(guild_id, "bypass_channel")

      if (!allowed_channel_id) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Bypass Channel Not Set",
                  "",
                  "Ask an admin to set it using `/bypass-channel-set`.",
                ]),
              ],
            }),
          ],
        })

        error_message.flags = (error_message.flags ?? 0) | 64

        await interaction.reply(error_message)
        return
      }

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

      const rate_limit = check_bypass_rate_limit(guild_id)
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

        rate_message.flags = (rate_message.flags ?? 0) | 64

        await interaction.reply(rate_message)
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
                content   : `Completed in ${result.time}s • Requested by <@${interaction.user.id}>`,
                accessory : component.secondary_button(
                  "Mobile Copy",
                  `bypass_mobile_copy:${interaction.user.id}:${interaction.id}`
                ),
              }),
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

      // - SEND TO DM - \\
      try {
        await interaction.user.send(success_message)
        console.log(`[ - BYPASS COMMAND - ] Sent result to ${interaction.user.tag}'s DM`)
      } catch (dm_error) {
        console.log(`[ - BYPASS COMMAND - ] Could not send DM to ${interaction.user.tag}`)
      }

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
