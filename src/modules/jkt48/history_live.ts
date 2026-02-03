import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../shared/types/command"
import { log_error }                                        from "../../shared/utils/error_logger"
import { build_history_message, get_history_records }       from "../../core/handlers/controllers/jkt48_live_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("history-live")
    .setDescription("View JKT48 live history")
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Choose the live platform")
        .setRequired(true)
        .addChoices(
          { name: "IDN", value: "idn" },
          { name: "Showroom", value: "showroom" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const platform = interaction.options.getString("platform", true)
      const records  = await get_history_records(interaction.client, platform)
      const message  = build_history_message({
        platform  : platform,
        records   : records,
        index     : 0,
        requester : interaction.user.username,
      })

      await interaction.editReply(message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "history_live_command", {})
      await interaction.editReply({
        content : "An error occurred while fetching live history.",
      }).catch(() => {})
    }
  },
}
