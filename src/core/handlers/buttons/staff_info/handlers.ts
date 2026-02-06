import { ButtonInteraction }          from "discord.js"
import { log_error }                  from "../../../../shared/utils/error_logger"
import { get_staff_info_document, custom_id_to_file_name } from "../../../../shared/utils/staff_info_parser"
import {
  container,
  text,
  separator,
} from "../../../../shared/utils/components"

/**
 * - BUILD STAFF INFO MESSAGE - \\
 * 
 * @param {object} options - Build options
 * @param {ReturnType<typeof get_staff_info_document>} options.doc - Staff info document
 * @param {string} options.selected_lang - Selected language code
 * @returns {message_payload} Message payload
 */
export function build_staff_info_message(options: {
  doc: NonNullable<Awaited<ReturnType<typeof get_staff_info_document>>>
  selected_lang: string
  include_flags?: boolean
}) {
  const { doc, selected_lang, include_flags = true } = options
  const components_list: any[] = []

  // - SPLIT CONTENT BY --- SEPARATORS - \\
  const sections = doc.content.split(/\n---\n/).filter((section) => section.trim())

  sections.forEach((section) => {
    const trimmed = section.trim()
    if (trimmed) {
      components_list.push(text(trimmed))
      components_list.push(separator(2))
    }
  })

  // - REMOVE LAST DIVIDER - \\
  if (components_list.length > 0 && components_list[components_list.length - 1].type === 14) {
    components_list.pop()
  }

  if (components_list.length === 0) {
    components_list.push(text("No content available."))
  }

  const message_payload: any = {
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
              custom_id: `staff_info_lang_select:${doc.file_name}`,
              placeholder: doc.metadata.button_title || "Bahasa // Language",
              options: [
                {
                  label: "Indonesian ( MAIN )",
                  value: "id",
                  default: selected_lang === "id",
                },
                {
                  label: "Indonesian ( Jaksel Version )",
                  value: "id_jaksel",
                  default: selected_lang === "id_jaksel",
                },
                {
                  label: "English",
                  value: "en",
                  default: selected_lang === "en",
                },
                {
                  label: "Japan",
                  value: "jp",
                  default: selected_lang === "jp",
                },
              ],
            }],
          },
          separator(2),
          text(`*Last Update: <t:${doc.metadata.last_update || Math.floor(Date.now() / 1000)}:F> - Updated by ${doc.metadata.updated_by?.map(id => `<@${id}>`).join(", ") || "System"}*`),
        ],
      }),
    ],
  }

  if (include_flags) {
    message_payload.flags = 32768
  }

  return message_payload
}

/**
 * - HANDLE STAFF INFO BUTTON - \\
 * 
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_staff_info_button(interaction: ButtonInteraction): Promise<void> {
  try {
    await interaction.deferReply({ ephemeral: true })

    const file_name = custom_id_to_file_name(interaction.customId)
    const language  = "id"
    
    const doc = await get_staff_info_document(file_name, language)

    if (!doc) {
      await interaction.editReply({
        content: "Staff information not found.",
      })
      return
    }

    const message_payload = build_staff_info_message({
      doc,
      selected_lang: language,
      include_flags: true,
    })

    await interaction.editReply(message_payload)
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
