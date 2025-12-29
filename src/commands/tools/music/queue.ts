import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                   from "discord.js"
import { Command }  from "../../../types/command"
import { get_queue } from "../../../interactions/controller/music_controller_distube"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the music queue"),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const guild  = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!member.voice.channel) {
      await interaction.reply({
        content   : "You need to be in a voice channel!",
        ephemeral : true,
      })
      return
    }

    const result = await get_queue({
      client : interaction.client,
      guild,
    })

    if (result.success) {
      await interaction.reply(result.message!)
    } else {
      await interaction.reply({
        content   : result.error || "Failed to get queue",
        ephemeral : true,
      })
    }
  },
}
