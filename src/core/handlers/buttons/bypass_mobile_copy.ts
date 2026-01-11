import { ButtonInteraction, EmbedBuilder } from "discord.js"
import { client } from "../../../index"

/**
 * - HANDLE BYPASS MOBILE COPY BUTTON - \\
 */
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return
  if (!interaction.customId.startsWith("bypass_mobile_copy:")) return

  try {
    const [, user_id, ...key_parts] = interaction.customId.split(":")
    const key                        = key_parts.join(":")

    if (interaction.user.id !== user_id) {
      await interaction.reply({
        content   : "This button is not for you!",
        ephemeral : true,
      })
      return
    }

    const mobile_embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle("Bypass Key")
      .setDescription(`\`\`\`\n${key}\n\`\`\``)
      .setFooter({ text: "Copy the key above" })
      .setTimestamp()

    await interaction.reply({
      embeds    : [mobile_embed],
      ephemeral : true,
    })

  } catch (error: any) {
    console.error(`[ - BYPASS MOBILE COPY - ] Error:`, error)

    try {
      await interaction.reply({
        content   : "An error occurred while processing your request",
        ephemeral : true,
      })
    } catch (reply_error) {
      console.error(`[ - BYPASS MOBILE COPY - ] Failed to send error message:`, reply_error)
    }
  }
})
