import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                         from "@shared/types/command"
import { component, db }                                   from "@shared/utils"
import { log_error }                                       from "@shared/utils/error_logger"

const GUILD_NOTIFICATION_SETTINGS_COLLECTION = "jkt48_guild_notification_settings"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("notify-channel-list")
    .setDescription("View JKT48 live notification channel settings") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      if (!interaction.guild) {
        await interaction.editReply({
          content: "This command can only be used in a server.",
        })
        return
      }

      // - FETCH GUILD SETTINGS - \\
      const settings = await db.find_many<{
        guild_id   : string
        channel_id : string
        platform   : string
        updated_at : number
        updated_by : string
      }>(GUILD_NOTIFICATION_SETTINGS_COLLECTION, {
        guild_id: interaction.guild.id,
      })

      if (settings.length === 0) {
        await interaction.editReply({
          content: "No notification channels have been set. Use `/notify-channel-set` to configure one.",
        })
        return
      }

      // - BUILD SETTINGS LIST - \\
      const settings_list = settings.map((setting) => {
        const platform_label = setting.platform === "idn" 
          ? "IDN Live" 
          : setting.platform === "showroom" 
            ? "Showroom" 
            : setting.platform
        const updated = new Date(setting.updated_at)
        return `**${platform_label}:** <#${setting.channel_id}>\n*Updated: <t:${Math.floor(setting.updated_at / 1000)}:R> by <@${setting.updated_by}>*`
      }).join("\n\n")

      const message = component.build_message({
        components: [
          component.container({
            accent_color: 0x5865F2,
            components: [
              component.text("## Notification Channel Settings"),
            ],
          }),
          component.container({
            components: [
              component.text(settings_list),
            ],
          }),
          component.container({
            components: [
              component.text("*Use `/notify-channel-set` to update or `/notify-channel-remove` to remove a platform.*"),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "notify_channel_list", {
        guild_id: interaction.guild?.id,
        user_id : interaction.user.id,
      })

      await interaction.editReply({
        content: "An error occurred while fetching notification settings.",
      })
    }
  },
}

export default command
