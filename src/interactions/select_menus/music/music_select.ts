import {
  StringSelectMenuInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
}                    from "discord.js"

export async function handle_music_select(interaction: StringSelectMenuInteraction) {
  try {
    const selected_source = interaction.values[0]

    let modal: ModalBuilder
    let placeholder: string
    let label: string

    switch (selected_source) {
      case "youtube":
        label       = "YouTube Search Query"
        placeholder = "Enter song name or artist..."
        break

      case "youtube_url":
        label       = "YouTube URL"
        placeholder = "https://youtube.com/watch?v=..."
        break

      case "spotify":
        label       = "Spotify URL"
        placeholder = "https://open.spotify.com/track/..."
        break

      case "soundcloud":
        label       = "SoundCloud URL"
        placeholder = "https://soundcloud.com/..."
        break

      default:
        await interaction.reply({
          content   : "Invalid selection",
          ephemeral : true,
        })
        return
    }

    modal = new ModalBuilder()
      .setCustomId(`music_modal:${selected_source}`)
      .setTitle("Play Music")

    const query_input = new TextInputBuilder()
      .setCustomId("music_query")
      .setLabel(label)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(placeholder)
      .setRequired(true)

    const action_row = new ActionRowBuilder<TextInputBuilder>().addComponents(query_input)

    modal.addComponents(action_row)

    await interaction.showModal(modal)
  } catch (error) {
    console.error("[music_select] Error:", error)
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content   : "An error occurred while processing your selection",
        ephemeral : true,
      })
    }
  }
}
