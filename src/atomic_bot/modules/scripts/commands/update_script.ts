// - /push-script 斜杠命令，上传本地脚本到 Luarmor - \
// - /push-script slash command, uploads local script file to Luarmor API - \
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                       from "@shared/types/command"
import { log_error }                     from "@shared/utils/error_logger"
import { build_update_script_message }   from "../controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("push-script")
    .setDescription("Push a local script file to Luarmor")
    .addStringOption((option) =>
      option
        .setName("file")
        .setDescription("Path to the local script file to upload")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    try {
      const file_path = interaction.options.getString("file", true)
      const message   = await build_update_script_message(file_path)

      await interaction.editReply(message as any)
    } catch (err) {
      await log_error(interaction.client, err as Error, "Update Script Command", {
        user_id  : interaction.user.id,
        guild_id : interaction.guildId ?? undefined,
      }).catch(() => {})
      await interaction.editReply({ content: "Failed to load script data. Please try again." })
    }
  },
}
