import { ButtonInteraction }          from "discord.js"
import { log_error }                  from "../../../../shared/utils/error_logger"
import { get_staff_info_document, custom_id_to_file_name } from "../../../../shared/utils/staff_info_parser"
import {
  build_message,
  container,
  text,
  divider,
} from "../../../../shared/utils/components"

/**
 * - HANDLE STAFF INFO BUTTON - \\
 * 
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_staff_info_button(interaction: ButtonInteraction): Promise<void> {
  try {
    const file_name = custom_id_to_file_name(interaction.customId)
    const language  = "id"
    
    const doc = await get_staff_info_document(file_name, language)

    if (!doc) {
      await interaction.reply({
        content: "Staff information not found.",
        ephemeral: true,
      })
      return
    }

    const components_list: any[] = []
    
    // - SPLIT CONTENT BY --- SEPARATORS - \\
    const sections = doc.content.split(/\n---\n/).filter(s => s.trim())
    
    sections.forEach(section => {
      const trimmed = section.trim()
      if (trimmed) {
        components_list.push(text(trimmed))
        components_list.push(divider(2))
      }
    })

    // - REMOVE LAST DIVIDER - \\
    if (components_list.length > 0 && components_list[components_list.length - 1].type === 14) {
      components_list.pop()
    }

    const message_payload = build_message({
      components: [
        container({
          components: components_list,
        }),
        container({
          components: [
            {
              type: 1,
              components: [{
                type: 3,
                custom_id: "staff_info_lang_select",
                placeholder: doc.metadata.button_title || "Bahasa // Language",
                options: [
                  {
                    label: "Indonesian ( MAIN )",
                    value: "id_main",
                    default: true,
                  },
                  {
                    label: "Indonesian ( Jaksel Version )",
                    value: "id_jaksel",
                    default: false,
                  },
                  {
                    label: "English",
                    value: "en",
                    default: false,
                  },
                  {
                    label: "Japan",
                    value: "jp",
                    default: false,
                  },
                ],
              }],
            },
            divider(2),
            text(`*Last Update: <t:${doc.metadata.last_update || Math.floor(Date.now() / 1000)}:F> - Updated by ${doc.metadata.updated_by?.map(id => `<@${id}>`).join(", ") || "System"}*`),
          ],
        }),
      ],
    })

    message_payload.flags = (message_payload.flags ?? 0) | 64

    await interaction.reply(message_payload)
  } catch (err) {
    console.log("[ - STAFF INFO BUTTON - ] Error:", err)
    await log_error(interaction.client, err as Error, "Staff Info Button", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      guild    : interaction.guild?.name || "DM",
      channel  : interaction.channel?.id,
    })

    if (!interaction.replied) {
      await interaction.reply({
        content: "Error displaying staff information.",
        ephemeral: true,
      }).catch(() => {})
    }
  }
}
