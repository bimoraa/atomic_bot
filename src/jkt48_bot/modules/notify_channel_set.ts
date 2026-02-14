import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js"
import { Command }                                                                          from "@shared/types/command"
import { component, db }                                                                    from "@shared/utils"
import { log_error }                                                                        from "@shared/utils/error_logger"

const __guild_notification_settings_collection = "jkt48_guild_notification_settings"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("notify-channel-set")
    .setDescription("Set notification channel for JKT48 live streams")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel for live stream notifications")
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Platform to set notification for")
        .setRequired(true)
        .addChoices(
          { name: "IDN Live", value: "idn" },
          { name: "Showroom", value: "showroom" },
          { name: "Both", value: "both" }
        )
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      if (!interaction.guild) {
        await interaction.editReply({
          content: "This command can only be used in a server.",
        })
        return
      }

      const channel_option = interaction.options.getChannel("channel", true)
      const platform        = interaction.options.getString("platform", true)

      // - FETCH FULL CHANNEL FROM GUILD - \\
      const channel = await interaction.guild.channels.fetch(channel_option.id)
      if (!channel) {
        await interaction.editReply({
          content: "Channel not found.",
        })
        return
      }

      // - VERIFY CHANNEL PERMISSIONS - \\
      if (!channel.isTextBased()) {
        await interaction.editReply({
          content: "Please select a valid text or announcement channel.",
        })
        return
      }

      // - CHECK BOT PERMISSIONS IN CHANNEL - \\
      const bot_member = interaction.guild.members.cache.get(interaction.client.user!.id)
      const permissions = channel.permissionsFor(bot_member!)

      if (!permissions?.has(["ViewChannel", "SendMessages", "EmbedLinks"])) {
        await interaction.editReply({
          content: "I don't have permission to send messages in that channel. Please ensure I have `View Channel`, `Send Messages`, and `Embed Links` permissions.",
        })
        return
      }

      // - SAVE TO DATABASE - \\
      const settings = {
        guild_id   : interaction.guild.id,
        channel_id : channel.id,
        platform   : platform,
        updated_at : Date.now(),
        updated_by : interaction.user.id,
      }

      await db.update_one(
        __guild_notification_settings_collection,
        { guild_id: interaction.guild.id, platform: platform },
        settings,
        true
      )

      // - IF BOTH, SAVE FOR IDN AND SHOWROOM SEPARATELY - \\
      if (platform === "both") {
        await db.update_one(
          __guild_notification_settings_collection,
          { guild_id: interaction.guild.id, platform: "idn" },
          { ...settings, platform: "idn" },
          true
        )
        await db.update_one(
          __guild_notification_settings_collection,
          { guild_id: interaction.guild.id, platform: "showroom" },
          { ...settings, platform: "showroom" },
          true
        )
      }

      const platform_label = platform === "both" 
        ? "IDN Live & Showroom" 
        : platform === "idn" 
          ? "IDN Live" 
          : "Showroom"

      const success_message = component.build_message({
        components: [
          component.container({
            accent_color: 0x57F287,
            components: [
              component.text("## Notification Channel Set"),
            ],
          }),
          component.container({
            components: [
              component.text([
                `**Channel:** <#${channel.id}>`,
                `**Platform:** ${platform_label}`,
                "",
                "Live stream notifications will now be sent to this channel.",
              ].join("\n")),
            ],
          }),
        ],
      })

      await interaction.editReply(success_message)

      console.log(`[ - JKT48 - ] Guild ${interaction.guild.id} set notification channel to ${channel.id} for ${platform}`)
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_channel_set", {
        guild_id  : interaction.guild?.id,
        user_id   : interaction.user.id,
      })

      await interaction.editReply({
        content: "An error occurred while setting the notification channel.",
      })
    }
  },
}

export default command
