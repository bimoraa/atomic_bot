import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js"
import { Command }                                                            from "@shared/types/command"
import { component, db }                                                      from "@shared/utils"
import { log_error }                                                          from "@shared/utils/error_logger"

const GUILD_NOTIFICATION_SETTINGS_COLLECTION = "jkt48_guild_notification_settings"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("notify-test")
    .setDescription("Test JKT48 live notification channel setup")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Platform to test")
        .setRequired(true)
        .addChoices(
          { name: "IDN Live", value: "idn" },
          { name: "Showroom", value: "showroom" }
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

      // - FETCH GUILD SETTINGS - \\
      const setting = await db.find_one<{
        guild_id   : string
        channel_id : string
        platform   : string
      }>(GUILD_NOTIFICATION_SETTINGS_COLLECTION, {
        guild_id: interaction.guild.id,
        platform: platform,
      })

      if (!setting) {
        await interaction.editReply({
          content: `No notification channel has been set for ${platform === "idn" ? "IDN Live" : "Showroom"}. Use \`/notify-channel-set\` to configure one.`,
        })
        return
      }

      // - SEND TEST MESSAGE TO CHANNEL - \\
      const channel = await interaction.guild.channels.fetch(setting.channel_id).catch(() => null)
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply({
          content: `Channel <#${setting.channel_id}> not found or is not a text channel. Please update the settings with \`/notify-channel-set\`.`,
        })
        return
      }

      const test_message = component.build_message({
        components: [
          component.container({
            accent_color: 0x5865F2,
            components: [
              component.text("## Test Notification"),
            ],
          }),
          component.container({
            components: [
              component.text([
                `**Platform:** ${platform === "idn" ? "IDN Live" : "Showroom"}`,
                `**Tested by:** ${interaction.user.tag}`,
                "",
                "This is a test notification. Live stream notifications will be sent to this channel.",
              ].join("\n")),
            ],
          }),
        ],
      })

      await channel.send(test_message)

      await interaction.editReply({
        content: `Test notification sent to <#${setting.channel_id}> successfully.`,
      })

      console.log(`[ - JKT48 - ] Test notification sent to guild ${interaction.guild.id} channel ${setting.channel_id} for ${platform}`)
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_test", {
        guild_id: interaction.guild?.id,
        user_id : interaction.user.id,
      })

      await interaction.editReply({
        content: "An error occurred while sending the test notification.",
      })
    }
  },
}

export default command
