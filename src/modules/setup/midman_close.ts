import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js"
import { Command } from "../../shared/types/command"
import { set_middleman_service_status } from "../../shared/database/managers/middleman_service_manager"
import { component, api } from "../../shared/utils"
import { log_error } from "../../shared/utils/error_logger"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("midman-close")
    .setDescription("Close middleman service temporarily")
    .addChannelOption((option) =>
      option
        .setName("send_to")
        .setDescription("Channel to send the announcement")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const channel = interaction.options.getChannel("send_to", true) as TextChannel

    if (!channel) {
      await interaction.editReply({ content: "Invalid channel selected." })
      return
    }

    try {
      // - UPDATE MIDDLEMAN SERVICE STATUS - \\
      const success = await set_middleman_service_status(
        interaction.guildId || "",
        false,
        interaction.user.id
      )

      if (!success) {
        await interaction.editReply({
          content: "Failed to close middleman service. Database might be unavailable.",
        })
        return
      }

      // - SEND ANNOUNCEMENT MESSAGE - \\
      const token = api.get_token()

      const announcement_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Middleman Service is Close!"),
            ],
            accent_color: 15277667,
          }),
          component.container({
            components: [
              component.section({
                content: "Midman tidak tersedia untuk sementara waktu.\nMohon jangan melakukan transaksi sampai ada pengumuman resmi.",
                accessory: component.primary_button("Info Selengkapnya", "midman_service_close_info"),
              }),
            ],
          }),
        ],
      })

      await api.send_components_v2(channel.id, token, announcement_message)

      await interaction.editReply({
        content: `✅ Middleman service has been **CLOSED**. Announcement sent to <#${channel.id}>.`,
      })
    } catch (error) {
      console.error("[ - MIDMAN CLOSE - ] Error:", error)
      await log_error(interaction.client, error as Error, "Midman Close Command", {
        user_id   : interaction.user.id,
        guild_id  : interaction.guildId || "",
        channel_id: channel.id,
      })

      await interaction.editReply({
        content: "An error occurred while closing middleman service. Please try again later.",
      })
    }
  },
}
