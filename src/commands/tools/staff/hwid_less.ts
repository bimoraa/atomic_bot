import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember } from "discord.js"
import { Command } from "../../../types/command"
import { is_staff } from "../../../services/permissions"
import { update_project_settings } from "../../../services/luarmor"
import { component } from "../../../utils"

const PROJECT_ID = "6958841b2d9e5e049a24a23e376e0d77"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("hwid-less")
    .setDescription("Enable or disable HWID-less mode")
    .addBooleanOption(opt =>
      opt.setName("value")
        .setDescription("Enable (true) or disable (false) HWID-less mode")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const member = interaction.member as GuildMember

      if (!is_staff(member)) {
        await interaction.reply({
          content: "Only staff can use this command.",
          flags: 64,
        })
        return
      }

      await interaction.deferReply({ flags: 64 })

      const value = interaction.options.getBoolean("value", true)

      const result = await update_project_settings(PROJECT_ID, value)

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
      const color  = value ? 0x57F287 : 0xED4245

      const success_message = component.build_message({
        components: [
          component.container({
            accent_color: color,
            components: [
              component.text([
                "## HWID-Less Update Success",
                `HWID-less mode has been **${status}**.`,
                ``,
                `- Project ID: \`${PROJECT_ID}\``,
                `- Updated by: <@${interaction.user.id}>`,
                `- Status: **${status}**`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(success_message)
    } catch (err) {
      console.error("[HWID-Less Error]", err)
      if (interaction.deferred) {
        await interaction.editReply({ content: "An error occurred while updating HWID-less setting." })
      } else {
        await interaction.reply({ content: "An error occurred while updating HWID-less setting.", flags: 64 })
      }
    }
  },
}

export default command
