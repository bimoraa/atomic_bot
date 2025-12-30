import { ButtonInteraction, GuildMember } from "discord.js"
import { pause_track }                    from "../../controllers/music_controller"

export async function handle_music_pause(interaction: ButtonInteraction): Promise<void> {
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

  const result = await pause_track({
    client : interaction.client,
    guild,
  })

  if (result.success) {
    await interaction.reply({
      content   : result.message || "Music paused",
      ephemeral : true,
    })
  } else {
    await interaction.reply({
      content   : result.error || "Failed to pause",
      ephemeral : true,
    })
  }
}
