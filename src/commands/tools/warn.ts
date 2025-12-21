import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                      from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for warning")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getMember("member") as GuildMember
    const reason   = interaction.options.getString("reason", true)

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content   : "You don't have permission to warn members.",
        ephemeral : true,
      })
      return
    }

    if (target.id === executor.id) {
      await interaction.reply({
        content   : "You cannot warn yourself.",
        ephemeral : true,
      })
      return
    }

    if (target.user.bot) {
      await interaction.reply({
        content   : "You cannot warn bots.",
        ephemeral : true,
      })
      return
    }

    if (executor.roles.highest.position <= target.roles.highest.position) {
      await interaction.reply({
        content   : "You cannot warn a member with equal or higher role.",
        ephemeral : true,
      })
      return
    }

    try {
      const server_icon = interaction.guild?.iconURL({ size: 512 }) || ""

      const dm_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content   : `### You have been warned in ${interaction.guild?.name}`,
                thumbnail : server_icon,
              }),
              component.divider(),
              component.text([
                `- Reason: ${reason}`,
                `- Warned by: <@${executor.id}>`,
              ]),
            ],
          }),
        ],
      })

      try {
        await target.send(dm_message)
      } catch {
      }

      const avatar_url = target.user.displayAvatarURL({ size: 512 })

      const warn_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content: [
                  "### Member Warned",
                  `- Member: <@${target.id}>`,
                  `- Warned by: <@${executor.id}>`,
                  `- Reason: ${reason}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await interaction.reply(warn_message)
    } catch (error) {
      const error_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xED4245,
            components: [
              component.text([
                "### Failed to warn member",
                `- Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              ].join("\n")),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...error_message,
        ephemeral: true,
      })
    }
  },
}
