import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                                from "discord.js"
import { Command }                from "@shared/types/command"
import { release_quarantine }     from "../../core/handlers/controllers/quarantine_controller"
import { component }              from "@shared/utils"

/**
 * @description Manually release a member from quarantine
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unquarantine")
    .setDescription("Release a member from quarantine and restore their roles")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to release from quarantine")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getUser("member")
    const guild    = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has("ModerateMembers")) {
      await interaction.reply({
        content   : "You don't have permission to release members from quarantine.",
        ephemeral : true,
      })
      return
    }

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const result = await release_quarantine({
      client  : interaction.client,
      guild,
      user_id : target.id,
    })

    if (!result.success) {
      await interaction.editReply({
        content: result.error || "Failed to release member from quarantine.",
      })
      return
    }

    const avatar_url = target.displayAvatarURL({ size: 512 })

    await interaction.editReply({
      ...component.build_message({
        components: [
          component.container({
            accent_color : 0x57F287,
            components   : [
              component.section({
                content   : "### Member Released from Quarantine",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${target.id}>`,
                `- Released by: <@${executor.id}>`,
              ]),
            ],
          }),
        ],
      }),
    })
  },
}
