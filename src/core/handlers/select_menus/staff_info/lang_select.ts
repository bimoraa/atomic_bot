import { StringSelectMenuInteraction, MessageFlags } from "discord.js"
import { log_error }                   from "../../../../shared/utils/error_logger"
import { get_staff_info_document } from "../../../../shared/utils/staff_info_parser"
import { build_staff_info_message }    from "../../buttons/staff_info/handlers"

/**
 * - HANDLE STAFF INFO LANGUAGE SELECT - \\
 * 
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @returns {Promise<void>}
 */
export async function handle_staff_info_lang_select(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    const selected_lang = interaction.values[0]
    const custom_parts  = interaction.customId.split(":")
    const file_name     = custom_parts[1] || null

    if (!file_name) {
      await interaction.reply({
        content: "Invalid staff information target.",
        ephemeral: true,
      })
      return
    }

    const doc = await get_staff_info_document(file_name, selected_lang)

    if (!doc) {
      await interaction.reply({
        content: "Staff information not found for selected language.",
        ephemeral: true,
      })
      return
    }

    const message_payload = build_staff_info_message({
      doc,
      selected_lang,
    })

    // Ensure Ephemeral bit is preserved if we are updating an ephemeral message
    // and passing flags for V2 components (32768)
    message_payload.flags |= MessageFlags.Ephemeral

    await interaction.update(message_payload)
  } catch (err) {
    console.log("[ - STAFF INFO LANG SELECT - ] Error:", err)
    await log_error(interaction.client, err as Error, "Staff Info Language Select", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      guild    : interaction.guild?.name || "DM",
      channel  : interaction.channel?.id,
    })

    if (!interaction.replied) {
      await interaction.reply({
        content: "Error changing language.",
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
