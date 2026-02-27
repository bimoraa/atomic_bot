import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder,
} from "discord.js"
import fs from "fs"
import path from "path"
import { Command } from "@shared/types/command"
import { bypass_link, bypass_max_retry } from "@shared/services/bypass_service"
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

      await interaction.deferReply()

      const settings = await guild_settings.get_all_guild_settings(guild_id)

      const bypass_enabled         = settings?.bypass_enabled
      const bypass_disabled_reason = settings?.bypass_disabled_reason || "No reason provided"
      const allowed_channel_id     = settings?.bypass_channel || null

      if (bypass_enabled === "false") {
        const maintenance_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Under Maintenance",
                  "",
                  `Reason: ${bypass_disabled_reason}`,
                ]),
              ],
            }),
          ],
        })

        await api.edit_deferred_reply(interaction, maintenance_message)
        return
      }

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

        await api.edit_deferred_reply(interaction, error_message)
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

        await api.edit_deferred_reply(interaction, error_message)
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

        await api.edit_deferred_reply(interaction, rate_message)
        return
      }

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

      const client_id  = interaction.client.user?.id || ""
      const invite_url = client_id
        ? `https://discord.com/api/oauth2/authorize?client_id=${client_id}&permissions=0&scope=bot%20applications.commands`
        : "https://discord.com/oauth2/authorize"

      const processing_message = component.build_message({
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

      await api.edit_deferred_reply(interaction, processing_message)

      const result = await bypass_link(url, async (attempt, wait_ms, is_processing) => {
        // - SKIP RETRY MESSAGE IF SERVER IS STILL PROCESSING - \\
        if (is_processing) return

        const wait_s          = Math.ceil(wait_ms / 1000)
        const wait_label      = wait_s > 5 ? ` - Rate limited, retrying in ~${wait_s}s...` : ""
        const retry_message   = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content   : `## <a:GTA_Loading:1459707117840629832> - Bypassing Link\nHang on! We're processing your bypass. (Retry ${attempt}/${bypass_max_retry}${wait_label})\n`,
                  accessory : component.link_button("Invite BOT", invite_url),
                }),
              ],
            }),
          ],
        })
        try {
          await api.edit_deferred_reply(interaction, retry_message)
        } catch (err) {
          console.warn(`[ - BYPASS COMMAND - ] Failed to edit retry message:`, err)
        }
      })

      console.warn(`[ - BYPASS COMMAND - ] Bypass result (attempts: ${result.attempts}):`, JSON.stringify(result))

      if (!result.success || !result.result) {
        const log_text = [
          `[ BYPASS ] - Bypassing Link`,
          `URL      : ${url}`,
          `User     : ${interaction.user.tag} (${interaction.user.id})`,
          `Guild    : ${interaction.guild?.name || "DM"}`,
          `Time     : ${new Date().toISOString()}`,
          ``,
          `[ BYPASS ] - Error Expected:`,
          `${result.error || "Unknown error occurred"}`,
          `Attempts : ${result.attempts ?? "N/A"}`,
        ].join("\n")

        try {
          await db.get_pool().query(
            `INSERT INTO bypass_cache (key, url, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '1 hour')
             ON CONFLICT (key) DO UPDATE SET url = $2, expires_at = NOW() + INTERVAL '1 hour'`,
            [`bypass_log_${interaction.id}`, log_text]
          )
        } catch (db_err) {
          console.error(`[ - BYPASS COMMAND - ] Failed to store log:`, db_err)
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
                  accessory : component.secondary_button("View Request Log", `bypass_request_log:${interaction.id}`),
                }),
              ],
            }),
          ],
        })

        try {
          await api.edit_deferred_reply(interaction, error_message)
        } catch (err) {
          console.warn(`[ - BYPASS COMMAND - ] Failed to send error message:`, err)
        }
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
        console.warn(`[ - BYPASS - ] Stored in database with key: ${cache_key}`)
      } catch (db_error) {
        console.error(`[ - BYPASS - ] Failed to store in database:`, db_error)
      }

      // - INCREMENT GLOBAL BYPASS COUNTER - \\
      db.increment_bypass_count().catch(err => console.error(`[ - BYPASS - ] Failed to increment bypass count:`, err))

      const success_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "## <:checkmark:1417196825110253780> - Bypass Completed\nYour bypass was completed successfully. Use /bypass or send a link to start another bypass.\n",
                accessory : component.thumbnail("attachment://BYPASS.png"),
              }),
            ],
          }),
          component.container({
            components: [
              component.text(`## <:rbx:1447976733050667061> - Desktop Copy\n\`\`\`\n${result.result}\n\`\`\``),
              component.divider(2),
              component.section({
                content   : `Completed in ${result.time}s • Requested by <@${interaction.user.id}> `,
                accessory : component.secondary_button(
                  "Mobile Copy",
                  `bypass_mobile_copy:${interaction.user.id}:${interaction.id}`
                ),
              }),
            ],
          }),
          component.container({
            components: [
              component.section({
                content   : "Want to invite the bot to your server? Click here →",
                accessory : component.link_button("Invite BOT", invite_url),
              }),
            ],
          }),
        ],
      })

      const bypass_image_path = path.join(process.cwd(), "assets", "images", "BYPASS.png")
      const has_bypass_image  = fs.existsSync(bypass_image_path)
      const bypass_image      = has_bypass_image ? fs.readFileSync(bypass_image_path) : undefined

      console.warn(`[ - BYPASS COMMAND - ] Sending success message...`)
      const send_result = has_bypass_image && bypass_image
        ? await api.edit_deferred_reply_with_files(interaction, success_message, [{
          name    : "BYPASS.png",
          content : bypass_image,
        }])
        : await api.edit_deferred_reply(interaction, success_message)
      
      if (send_result.error) {
        console.error(`[ - BYPASS COMMAND - ] Failed to send success message:`, JSON.stringify(send_result))
        throw new Error(`Failed to send message: ${JSON.stringify(send_result)}`)
      }
      
      console.warn(`[ - BYPASS COMMAND - ] Success message sent!`)

      // - SEND TO DM - \\
      try {
        const dm_success_message = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content   : "## <:checkmark:1417196825110253780> - Bypass Completed\nYour bypass was completed successfully. Use /bypass or send a link to start another bypass.\n",
                  accessory : component.thumbnail("https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true"),
                }),
              ],
            }),
            component.container({
              components: [
                component.text(`## <:rbx:1447976733050667061> - Desktop Copy\n\`\`\`\n${result.result}\n\`\`\``),
                component.divider(2),
                component.section({
                  content   : `Completed in ${result.time}s • Requested by <@${interaction.user.id}> `,
                  accessory : component.secondary_button(
                    "Mobile Copy",
                    `bypass_mobile_copy:${interaction.user.id}:${interaction.id}`
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

        await interaction.user.send(dm_success_message)
        console.warn(`[ - BYPASS COMMAND - ] Sent result to ${interaction.user.tag}'s DM`)
      } catch (dm_error) {
        console.warn(`[ - BYPASS COMMAND - ] Could not send DM to ${interaction.user.tag}`)
      }

    } catch (error: any) {
      console.error(`[ - BYPASS COMMAND - ] Error:`, error)

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
                content   : "An unexpected error occurred while processing your request.",
                accessory : component.secondary_button("View Request Log", `bypass_request_log:${interaction.id}`),
              }),
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
