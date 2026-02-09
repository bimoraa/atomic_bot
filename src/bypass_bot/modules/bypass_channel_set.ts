import {
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js"
import { Command } from "@shared/types/command"
import { component, guild_settings } from "@shared/utils"

/**
 * - BYPASS CHANNEL SET COMMAND - \\
 */
const bypass_channel_set_command: Command = {
  data: new SlashCommandBuilder()
    .setName("bypass-channel-set")
    .setDescription("Set the channel for bypass commands in this server")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel where /bypass and auto-bypass are allowed")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction) => {
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

    const channel = interaction.options.getChannel("channel", true)
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Invalid Channel",
                "",
                "Please select a text channel.",
              ]),
            ],
          }),
        ],
      })

      error_message.flags = (error_message.flags ?? 0) | 64

      await interaction.reply(error_message)
      return
    }

    const saved = await guild_settings.set_guild_setting(guild_id, "bypass_channel", channel.id)

    const response_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              saved ? "## Bypass Channel Set" : "## Failed to Save",
              "",
              saved
                ? `Bypass channel set to <#${channel.id}>.`
                : "Could not save the bypass channel. Please try again.",
            ]),
          ],
        }),
      ],
    })

    response_message.flags = (response_message.flags ?? 0) | 64

    await interaction.reply(response_message)
  },
}

export default bypass_channel_set_command
