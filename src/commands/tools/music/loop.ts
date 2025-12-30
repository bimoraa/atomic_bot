import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                   from "discord.js"
import { Command }  from "../../../types/command"
import { set_loop } from "../../../interactions/controllers/music_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Set loop mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Loop mode")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "off" },
          { name: "Track", value: "track" },
          { name: "Queue", value: "queue" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const guild  = interaction.guild
    const mode   = interaction.options.getString("mode", true) as "off" | "track" | "queue"

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

    const result = await set_loop({
      client : interaction.client,
      guild,
      mode,
    })

    if (result.success) {
      await interaction.reply({
        content   : result.message || "Loop mode updated",
        ephemeral : true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to set loop mode",
        ephemeral : true,
      })
    }
  },
}
