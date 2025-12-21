import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
} from "discord.js"
import { Command }        from "../../types/command"
import { is_admin }       from "../../functions/permissions"
import { component, api } from "../../utils"
import { http, env, logger } from "../../utils"

const __log           = logger.create_logger("mass_user_note")
const FREE_PROJECT_ID = "cd7560b7384fd815dafd993828c40d2b"

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_headers(): Record<string, string> {
  return {
    Authorization : get_api_key(),
  }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("mass-user-note")
    .setDescription("Set note for all free script users")
    .addStringOption(option =>
      option
        .setName("note")
        .setDescription("The note to set for all users")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content : "You don't have permission to use this command.",
        flags   : 64,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const note = interaction.options.getString("note", true)

    try {
      const all_users_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users`
      const all_users_res = await http.get<any>(all_users_url, get_headers())

      if (!all_users_res.users || !Array.isArray(all_users_res.users)) {
        await api.edit_deferred_reply(interaction, component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Error",
                  "Failed to fetch users from Luarmor.",
                ]),
              ],
            }),
          ],
        }))
        return
      }

      const users        = all_users_res.users
      let success_count  = 0
      let failed_count   = 0

      for (let i = 0; i < users.length; i++) {
        const user = users[i]
        
        try {
          const update_url  = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users`
          const update_body = {
            user_key : user.user_key,
            note     : note,
          }

          const update_res = await http.patch<any>(update_url, update_body, get_headers())

          if (update_res.success === true || update_res.message?.toLowerCase().includes("success")) {
            success_count++
          } else {
            failed_count++
            __log.error(`Failed to update user ${user.user_key}:`, update_res.message)
          }

          const progress_message = component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## Mass User Note Update",
                    "",
                    `**Note:** ${note}`,
                    "",
                    `**Progress:** ${i + 1}/${users.length}`,
                    `**Success:** ${success_count} users`,
                    `**Failed:** ${failed_count} users`,
                  ]),
                ],
              }),
            ],
          })

          await api.edit_deferred_reply(interaction, progress_message)
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          failed_count++
          __log.error(`Error updating user ${user.user_key}:`, error)
          
          const progress_message = component.build_message({
            components: [
              component.container({
                components: [
                  component.text([
                    "## Mass User Note Update",
                    "",
                    `**Note:** ${note}`,
                    "",
                    `**Progress:** ${i + 1}/${users.length}`,
                    `**Success:** ${success_count} users`,
                    `**Failed:** ${failed_count} users`,
                  ]),
                ],
              }),
            ],
          })

          await api.edit_deferred_reply(interaction, progress_message)
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Mass User Note Update - Complete",
                "",
                `**Note:** ${note}`,
                "",
                `**Success:** ${success_count} users`,
                `**Failed:** ${failed_count} users`,
                `**Total:** ${users.length} users`,
              ]),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, message)
    } catch (error) {
      __log.error("Failed to update users:", error)

      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "Failed to connect to Luarmor API.",
              ]),
            ],
          }),
        ],
      }))
    }
  },
}
