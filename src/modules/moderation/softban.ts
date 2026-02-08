import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import { Command }  from "../../shared/types/command"
import { component } from "../../shared/utils"

const softban: Command = {
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Softban a user (ban then unban to delete messages)")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to softban")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for softban")
        .setRequired(false)
        .setMaxLength(512)
    )
    .addIntegerOption(option =>
      option
        .setName("delete_days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false),

  async execute(interaction: ChatInputCommandInteraction) {
    const target      = interaction.options.getUser("user", true)
    const reason      = interaction.options.getString("reason") || "No reason provided"
    const delete_days = interaction.options.getInteger("delete_days") || 1

    if (!interaction.guild) {
      await interaction.reply({
        content  : "This command can only be used in a server.",
        ephemeral: true,
      })
      return
    }

    const member = await interaction.guild.members.fetch(target.id).catch(() => null)

    if (!member) {
      await interaction.reply({
        content  : "User not found in this server.",
        ephemeral: true,
      })
      return
    }

    if (member.id === interaction.user.id) {
      await interaction.reply({
        content  : "You cannot softban yourself.",
        ephemeral: true,
      })
      return
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({
        content  : "You cannot softban the server owner.",
        ephemeral: true,
      })
      return
    }

    const bot_member = await interaction.guild.members.fetchMe()
    
    if (member.roles.highest.position >= bot_member.roles.highest.position) {
      await interaction.reply({
        content  : "I cannot softban this user due to role hierarchy.",
        ephemeral: true,
      })
      return
    }

    const executor_member = await interaction.guild.members.fetch(interaction.user.id)
    
    if (executor_member.id !== interaction.guild.ownerId && member.roles.highest.position >= executor_member.roles.highest.position) {
      await interaction.reply({
        content  : "You cannot softban this user due to role hierarchy.",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply()

    try {
      await member.send(
        component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  `## You have been softbanned from ${interaction.guild.name}`,
                  `**Reason:** ${reason}`,
                  `**Moderator:** ${interaction.user.tag}`,
                  ``,
                  `You can rejoin the server using an invite link.`,
                ]),
              ],
            }),
          ],
        })
      ).catch(() => {})

      await member.ban({
        reason        : `Softban by ${interaction.user.tag}: ${reason}`,
        deleteMessageSeconds: delete_days * 24 * 60 * 60,
      })

      await interaction.guild.members.unban(target.id, `Softban cleanup by ${interaction.user.tag}`)

      const success_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## User Softbanned`,
                `**User:** <@${target.id}> (${target.tag})`,
                `**Moderator:** <@${interaction.user.id}>`,
                `**Reason:** ${reason}`,
                `**Messages Deleted:** ${delete_days} day${delete_days !== 1 ? "s" : ""}`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(success_message)
    } catch (error) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text(`Failed to softban user: ${error instanceof Error ? error.message : "Unknown error"}`),
            ],
          }),
        ],
      })

      await interaction.editReply(error_message)
    }
  },
}

export default softban
