import { ModalSubmitInteraction } from "discord.js"
import { load_config } from "../../configuration/loader"
import { component, api, format } from "../../utils"

const config = load_config<{ devlog_channel_id: string; priority_role_id: string }>("devlog")
const devlog_channel_id = config.devlog_channel_id
const priority_role_id = config.priority_role_id

function format_list(items: string, prefix: string): string {
  if (!items.trim()) return ""
  return items
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `${prefix} ${line.trim()}`)
    .join("\n")
}

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("devlog_modal_")) return false

  const parts = interaction.customId.replace("devlog_modal_", "").split("_")
  const version = parts.pop()!
  const script = parts.join("_")

  const added = interaction.fields.getTextInputValue("added")
  const improved = interaction.fields.getTextInputValue("improved")
  const removed = interaction.fields.getTextInputValue("removed")
  const fixed = interaction.fields.getTextInputValue("fixed")

  await interaction.deferReply({ ephemeral: true })

  let changelog = "## Changelogs\n"

  const added_list = format_list(added, "[ + ]")
  const improved_list = format_list(improved, "[ / ]")
  const removed_list = format_list(removed, "[ - ]")
  const fixed_list = format_list(fixed, "[ ! ]")

  if (added_list) changelog += `\n### - Added:\n${added_list}\n`
  if (improved_list) changelog += `\n### - Improved:\n${improved_list}\n`
  if (removed_list) changelog += `\n### - Removed:\n${removed_list}\n`
  if (fixed_list) changelog += `\n### - Fixed:\n${fixed_list}\n`

  if (!added_list && !improved_list && !removed_list && !fixed_list) {
    changelog += "\nNo changes specified."
  }

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Atomicals Script Update Logs`,
              `${format.role_mention(priority_role_id)}`,
              `- **${script}**`,
              `- **Version:** v${version}`,
              `- **Developer Notes:**`,
              `> Found any bugs or issues? Feel free to report them to the developers!`,
              `> Got ideas or suggestions for new scripts? We'd love to hear them!`,
            ],
            thumbnail: format.logo_url,
          }),
          component.divider(),
          component.text(changelog),
          component.divider(),
          component.action_row(
            component.link_button("Report Bugs", "https://discord.com/channels/1250337227582472243/1320078429110145114"),
            component.link_button("Suggest a Feature", "https://discord.com/channels/1250337227582472243/1351980309557542962")
          ),
        ],
      }),
    ],
  })

  const response = await api.send_components_v2(devlog_channel_id, api.get_token(), message)

  if (!response.error) {
    await interaction.editReply({ content: `Developer log sent for **${script}** v${version}!` })
  } else {
    console.error("[devlog] Error:", response)
    await interaction.editReply({ content: "Failed to send developer log." })
  }

  return true
}
