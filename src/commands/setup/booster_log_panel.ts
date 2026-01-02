import { ChatInputCommandInteraction, SlashCommandBuilder, ChannelType } from "discord.js"
import { Command }                                                       from "../../types/command"
import { file }                                                          from "../../utils"

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-booster-log")
    .setDescription("Setup booster log channel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel for booster logs")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 })

    const channel = interaction.options.getChannel("channel", true)

    const config = {
      booster_log_channel_id: channel.id,
      booster_media_url     : "",
    }

    const config_path = "src/configuration/booster.cfg"
    file.write_json(config_path, config)

    await interaction.editReply({
      content: `Booster log channel set to <#${channel.id}>`,
    })
  },
}

export default command
