import { ButtonInteraction } from "discord.js"
import { log_error } from "../../../../shared/utils/error_logger"
import { custom_id_to_file_name, get_staff_info_document } from "../../../../shared/utils/staff_info_parser"
import { container, divider, select_menu, text, type divider_component, type text_component, type action_row_component } from "../../../../shared/utils/components"

export async function handle_staff_info_button(interaction: ButtonInteraction): Promise<void> {
  try {
    const file_name = custom_id_to_file_name(interaction.customId)
    const language = "id"
    const doc = await get_staff_info_document(file_name, language)

    if (!doc) {
      await interaction.reply({
        content: "Staff information not found.",
        ephemeral: true,
      })
      return
    }

    const components_list: Array<text_component | divider_component> = []
    const sections = doc.content.split(/\n---\n/).filter((section) => section.trim())

    sections.forEach((section) => {
      const trimmed = section.trim()
      if (trimmed) {
        components_list.push(text(trimmed))
        components_list.push(divider(2))
      }
    })

    if (components_list.length > 0 && components_list[components_list.length - 1].type === 14) {
      components_list.pop()
    }

    const info_components: Array<action_row_component | divider_component | text_component> = [
      select_menu("staff_info_lang_select", doc.metadata.button_title || "Bahasa // Language", [
        { label: "Indonesian ( MAIN )", value: "id_main", default: true },
        { label: "Indonesian ( Jaksel Version )", value: "id_jaksel", default: false },
        { label: "English", value: "en", default: false },
        { label: "Japan", value: "jp", default: false },
      ]),
      divider(2),
      text(`*Last Update: <t:${doc.metadata.last_update || Math.floor(Date.now() / 1000)}:F> - Updated by ${doc.metadata.updated_by?.map((id) => `<@${id}>`).join(", ") || "System"}*`),
    ]

    const message_payload = {
      flags: 64,
      components: [
        container({ components: components_list }),
        container({ components: info_components }),
      ],
    }

    await interaction.reply(message_payload)
  } catch (err) {
    console.log("[ - STAFF INFO BUTTON - ] Error:", err)
    await log_error(interaction.client, err as Error, "Staff Info Button", {
      custom_id: interaction.customId,
      user: interaction.user.tag,
      guild: interaction.guild?.name || "DM",
      channel: interaction.channel?.id,
    })

    if (!interaction.replied) {
      await interaction.reply({
        content: "Error displaying staff information.",
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
