import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command } from "@shared/types/command"
import { update_project_settings } from "../../../infrastructure/api/luarmor"
import { component } from "@shared/utils"

const __project_id         = "6958841b2d9e5e049a24a23e376e0d77"
const __required_role_id   = "1316021423206039596"
const __notification_user  = "1118453649727823974"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("hwid_less")
    .setDescription("Enable or disable HWID-less mode")
    .addBooleanOption(opt =>
      opt.setName("value")
        .setDescription("Enable (true) or disable (false) HWID-less mode")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const member = interaction.member as GuildMember

      if (!member.roles.cache.has(__required_role_id)) {
        await interaction.reply({
          content: "You do not have permission to use this command.",
          flags: 64,
        })
        return
      }

      await interaction.deferReply()

      const value = interaction.options.getBoolean("value", true)

      const result = await update_project_settings(__project_id, value)

      if (!result.success) {
        const error_message = component.build_message({
          components: [
            component.container({
              accent_color: 0xED4245,
              components: [
                component.text([
                  "## HWID-Less Update Failed",
                  `Failed to update HWID-less setting.`,
                  ``,
                  `Error: ${result.error || "Unknown error"}`,
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(error_message)
        return
      }

      const status = value ? "Enabled" : "Disabled"

      const success_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xE91E63,
            components: [
              component.text("## HWID-Less Update Success!!"),
            ],
          }),
          component.container({
            components: [
              component.text([
                "## Details:",
                `- Status: **${status}**`,
                `- Updated by: <@${interaction.user.id}>`,
                `- Project \`${__project_id}\``,
                ``,
                ``,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(success_message)

      try {
        const notification_user = await interaction.client.users.fetch(__notification_user)
        const dm_message        = component.build_message({
          components: [
            component.container({
              accent_color: 0xE91E63,
              components: [
                component.text("## HWID-Less Update Notification"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  "## Details:",
                  `- Status: **${status}**`,
                  `- Updated by: <@${interaction.user.id}> (\`${interaction.user.tag}\`)`,
                  `- Server: **${interaction.guild?.name}**`,
                  `- Project \`${__project_id}\``,
                  ``,
                  ``,
                ]),
              ],
            }),
          ],
        })

        await notification_user.send(dm_message)
      } catch (dm_error) {
        console.error("[ - HWID-LESS - ] Failed to send DM notification:", dm_error)
      }
    } catch (err) {
      console.error("[ - HWID-LESS - ] Error:", err)
      if (interaction.deferred) {
        await interaction.editReply({ content: "An error occurred while updating HWID-less setting." })
      } else {
        await interaction.reply({ content: "An error occurred while updating HWID-less setting.", flags: 64 })
      }
    }
  },
}

export default command
