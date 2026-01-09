import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
}                      from "discord.js"
import { Command }     from "../../../shared/types/command"
import { component }   from "../../../shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages at once")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of messages to delete (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Only delete messages from this user")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const amount   = interaction.options.getInteger("amount", true)
    const target   = interaction.options.getUser("user")
    const channel  = interaction.channel as TextChannel

    if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("### You don't have permission to manage messages."),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...error_message,
        ephemeral: true,
      })
      return
    }

    if (!channel.isTextBased()) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("### This command can only be used in text channels."),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...error_message,
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      const messages = await channel.messages.fetch({ limit: amount + 1 })
      
      let to_delete = messages.filter(msg => {
        if (target) {
          return msg.author.id === target.id
        }
        return true
      })

      to_delete = to_delete.filter(msg => {
        const age = Date.now() - msg.createdTimestamp
        return age < 14 * 24 * 60 * 60 * 1000
      })

      if (to_delete.size === 0) {
        const no_messages = component.build_message({
          components: [
            component.container({
              components: [
                component.text("### No messages found to delete. Messages must be less than 14 days old."),
              ],
            }),
          ],
        })

        await interaction.editReply(no_messages)
        return
      }

      const deleted = await channel.bulkDelete(to_delete, true)

      const purge_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "### Messages Purged",
                `- Deleted: ${deleted.size} messages`,
                `- Channel: <#${channel.id}>`,
                target ? `- User: <@${target.id}>` : "",
                `- Purged by: <@${executor.id}>`,
              ].filter(line => line).join("\n")),
            ],
          }),
        ],
      })

      await interaction.editReply(purge_message)

      setTimeout(async () => {
        try {
          await interaction.deleteReply()
        } catch {}
      }, 5000)

    } catch (error) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "### Failed to purge messages",
                `- Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              ].join("\n")),
            ],
          }),
        ],
      })

      await interaction.editReply(error_message)
    }
  },
}
