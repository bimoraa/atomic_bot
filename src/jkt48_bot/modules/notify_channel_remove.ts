import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import { Command }                                                            from "@shared/types/command"
import { component, db }                                                      from "@shared/utils"
import { log_error }                                                          from "@shared/utils/error_logger"

const GUILD_NOTIFICATION_SETTINGS_COLLECTION = "jkt48_guild_notification_settings"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("notify-channel-remove")
    .setDescription("Remove notification channel for a platform")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Platform to remove notification for")
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

      const platform = interaction.options.getString("platform", true)

      // - REMOVE FROM DATABASE - \\
      if (platform === "both") {
        await db.delete_many(GUILD_NOTIFICATION_SETTINGS_COLLECTION, {
          guild_id: interaction.guild.id,
        })
      } else {
        const result = await db.delete_one(GUILD_NOTIFICATION_SETTINGS_COLLECTION, {
          guild_id: interaction.guild.id,
          platform: platform,
        })

        if (!result) {
          await interaction.editReply({
            content: `No notification channel found for ${platform === "idn" ? "IDN Live" : "Showroom"}.`,
          })
          return
        }
      }

      const platform_label = platform === "both" 
        ? "all platforms" 
        : platform === "idn" 
          ? "IDN Live" 
          : "Showroom"

      const success_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xED4245,
            components: [
              component.text("## Notification Channel Removed"),
            ],
          }),
          component.container({
            components: [
              component.text([
                `**Platform:** ${platform_label}`,
                "",
                "Live stream notifications will no longer be sent to this server.",
                "",
                "*Use `/notify-channel-set` to configure notifications again.*",
              ].join("\n")),
            ],
          }),
        ],
      })

      await interaction.editReply(success_message)

      console.log(`[ - JKT48 - ] Guild ${interaction.guild.id} removed notification channel for ${platform}`)
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_channel_remove", {
        guild_id: interaction.guild?.id,
        user_id : interaction.user.id,
      })

      await interaction.editReply({
        content: "An error occurred while removing the notification channel.",
      })
    }
  },
}

export default command
