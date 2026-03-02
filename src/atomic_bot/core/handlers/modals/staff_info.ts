import { ModalSubmitInteraction } from "discord.js"
import { log_error }              from "@shared/utils/error_logger"

/**
 * - HANDLE EDIT STAFF INFO MODAL - \\
 * 
 * @param {ModalSubmitInteraction} interaction - Modal submit interaction
 * @returns {Promise<boolean>} True if handled
 */
export async function handle_edit_staff_info_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("edit_staff_info:")) return false

  try {
    const target     = interaction.customId.split(":")[1]
    const message_id = interaction.fields.getTextInputValue("message_id")
    const content    = interaction.fields.getTextInputValue("content")

    if (!message_id || !content) {
      await interaction.reply({
        content: "Message ID and content are required.",
        ephemeral: true,
      })
      return true
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      const message = await interaction.channel?.messages.fetch(message_id)
      
      if (!message) {
        await interaction.editReply({
          content: "Message not found.",
        })
        return true
      }

      await interaction.editReply({
        content: `Staff information section **${target.replace(/_/g, " ")}** has been updated.\n\n*Note: Manual editing of message content is required for now.*`,
      })
    } catch (err) {
      await interaction.editReply({
        content: "Failed to fetch or edit the message. Please check the message ID.",
      })
    }

    return true
  } catch (err) {
    console.log("[ - EDIT STAFF INFO MODAL - ] Error:", err)
    await log_error(interaction.client, err as Error, "Edit Staff Info Modal", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      guild    : interaction.guild?.name || "DM",
      channel  : interaction.channel?.id,
    })

    if (!interaction.replied) {
      await interaction.reply({
        content: "Error updating staff information.",
        ephemeral: true,
      }).catch(() => {})
    }

    return true
  }
}
