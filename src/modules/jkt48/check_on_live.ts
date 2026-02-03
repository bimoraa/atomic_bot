import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../shared/types/command"
import { log_error }                                        from "../../shared/utils/error_logger"
import { build_live_message, get_live_rooms }               from "../../core/handlers/controllers/jkt48_live_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check-on-live")
    .setDescription("Check which JKT48 members are currently live")
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
      const rooms    = await get_live_rooms(interaction.client, platform)
      const message  = build_live_message({
        platform  : platform,
        rooms     : rooms,
        index     : 0,
        requester : interaction.user.username,
      })

      await interaction.editReply(message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "check_on_live_command", {})
      await interaction.editReply({
        content : "An error occurred while checking live streams.",
      }).catch(() => {})
    }
  },
}
