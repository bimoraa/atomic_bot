import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
  User,
}                      from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member from the server")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to ban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for banning")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Number of days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor    = interaction.member as GuildMember
    const user        = interaction.options.getUser("member") as User
    const reason      = interaction.options.getString("reason") || "No reason provided"
    const delete_days = interaction.options.getInteger("delete_days") || 0
    const guild       = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!user) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content   : "You don't have permission to ban members.",
        ephemeral : true,
      })
      return
    }

    if (user.id === executor.id) {
      await interaction.reply({
        content   : "You cannot ban yourself.",
        ephemeral : true,
      })
      return
    }

    const target = await guild.members.fetch(user.id).catch(() => null)

    if (target) {
      if (!target.bannable) {
        await interaction.reply({
          content   : "I cannot ban this member. They may have a higher role than me.",
          ephemeral : true,
        })
        return
      }

      if (executor.roles.highest.position <= target.roles.highest.position) {
        await interaction.reply({
          content   : "You cannot ban a member with equal or higher role.",
          ephemeral : true,
        })
        return
      }
    }

    try {
      const server_icon = guild.iconURL({ size: 512 }) || ""

      const dm_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "### You have been banned",
                thumbnail : server_icon,
              }),
              component.divider(),
              component.text([
                `- Server: ${guild.name}`,
                `- Reason: ${reason}`,
              ]),
            ],
          }),
        ],
      })

      await user.send(dm_message).catch(() => {})

      await guild.members.ban(user, {
        reason,
        deleteMessageSeconds: delete_days * 24 * 60 * 60,
      })

      const avatar_url = user.displayAvatarURL({ size: 512 })

      const ban_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : "### Member Banned",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${user.id}>`,
                `- Banned by: <@${executor.id}>`,
                `- Reason: ${reason}`,
                `- Messages deleted: ${delete_days} days`,
              ]),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...ban_message,
        ephemeral: true,
      })
    } catch (error) {
      const error_message = error instanceof Error ? error.message : "Unknown error"
      await interaction.reply({
        content   : `Failed to ban member: ${error_message}`,
        ephemeral : true,
      })
    }
  },
}
