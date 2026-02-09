import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js"
import { Command } from "@shared/types/command"
import { set_middleman_service_status } from "@shared/database/managers/middleman_service_manager"
import { component, api } from "@shared/utils"
import { log_error } from "@shared/utils/error_logger"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("midman-open")
    .setDescription("Open middleman service")
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
        true,
        interaction.user.id
      )

      if (!success) {
        await interaction.editReply({
          content: "Failed to open middleman service. Database might be unavailable.",
        })
        return
      }

      // - SEND ANNOUNCEMENT MESSAGE - \\
      const token = api.get_token()

      const announcement_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Middleman Service is Open!"),
            ],
            accent_color: 3066993,
          }),
          component.container({
            components: [
              component.text(
                "Layanan Midman (ID) telah dibuka kembali dan siap melayani transaksi.\n" +
                "Seluruh transaksi kini sudah dapat menggunakan midman seperti biasa.\n\n" +
                "Mohon tetap mengikuti aturan dan prosedur yang berlaku demi keamanan bersama.\n" +
                "Jika ada kendala atau pertanyaan, silakan hubungi midman terkait."
              ),
            ],
          }),
        ],
      })

      await api.send_components_v2(channel.id, token, announcement_message)

      await interaction.editReply({
        content: `✅ Middleman service has been **OPENED**. Announcement sent to <#${channel.id}>.`,
      })
    } catch (error) {
      console.error("[ - MIDMAN OPEN - ] Error:", error)
      await log_error(interaction.client, error as Error, "Midman Open Command", {
        user_id   : interaction.user.id,
        guild_id  : interaction.guildId || "",
        channel_id: channel.id,
      })

      await interaction.editReply({
        content: "An error occurred while opening middleman service. Please try again later.",
      })
    }
  },
}
