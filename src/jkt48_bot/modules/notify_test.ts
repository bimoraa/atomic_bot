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
      const fail = async (content: string): Promise<void> => {
        await interaction.editReply({ content: content })
      }

      if (!interaction.guild) {
        await fail("This command can only be used in a server.")
        return
      }

      const platform       = interaction.options.getString("platform", true)
      const platform_label = platform === "idn" ? "IDN Live" : "Showroom"

      const setting = await db.find_one<{
        guild_id   : string
        channel_id : string
        platform   : string
      }>(GUILD_NOTIFICATION_SETTINGS_COLLECTION, {
        guild_id : interaction.guild.id,
        platform : platform,
      })

      if (!setting) {
        await fail(`No notification channel has been set for ${platform_label}. Use \`/notify-channel-set\` to configure one.`)
        return
      }

      const channel = await interaction.guild.channels.fetch(setting.channel_id).catch(() => null)
      if (!channel || !channel.isTextBased()) {
        await fail(`Channel <#${setting.channel_id}> not found or is not a text channel. Please update the settings with \`/notify-channel-set\`.`)
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
                `**Platform:** ${platform_label}`,
                `**Tested by:** ${interaction.user.tag}`,
                "",
                "This is a test notification. Live stream notifications will be sent to this channel.",
              ]),
            ],
          }),
        ],
      })

      await channel.send(test_message)
      await fail(`Test notification sent to <#${setting.channel_id}> successfully.`)

      console.log(`[ - JKT48 - ] Test notification sent to guild ${interaction.guild.id} channel ${setting.channel_id} for ${platform}`)
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_test", {
        guild_id : interaction.guild?.id,
        user_id : interaction.user.id,
      })

      await interaction.editReply({ content: "An error occurred while sending the test notification." })
    }
  },
}

export default command
