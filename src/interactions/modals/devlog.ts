import { ModalSubmitInteraction } from "discord.js"
import { load_config } from "../../configuration/loader"
import { component, api, format } from "../../utils"

const config = load_config<{ devlog_channel_id: string; priority_role_id: string }>("devlog")
const devlog_channel_id = config.devlog_channel_id
const priority_role_id = config.priority_role_id
const devlog_thumb_url  = "https://github.com/bimoraa/Euphoria/blob/main/aaaaa.png?raw=true"

function format_list(items: string, prefix: string): string {
  if (!items.trim()) return ""
  return items
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => `${prefix} ${line.trim()}`)
    .join("\n")
}

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("devlog_modal")) return false

  let script  = ""
  let version = ""
  let role_ids: string[] = []

  if (interaction.customId.startsWith("devlog_modal|")) {
    const segments = interaction.customId.split("|").slice(1)
    for (const segment of segments) {
      const [key, value] = segment.split("=")
      if (key === "s") script = decodeURIComponent(value || "")
      if (key === "v") version = decodeURIComponent(value || "")
      if (key === "r" && value) role_ids = value.split(",").filter(Boolean)
    }
  } else if (interaction.customId.startsWith("devlog_modal_")) {
    const parts = interaction.customId.replace("devlog_modal_", "").split("_")
    version = parts.pop() || ""
    script  = parts.join("_")
  }

  if (!script || !version) return false

  const added = interaction.fields.getTextInputValue("added")
  const improved = interaction.fields.getTextInputValue("improved")
  const removed = interaction.fields.getTextInputValue("removed")
  const fixed = interaction.fields.getTextInputValue("fixed")

  await interaction.deferReply({ ephemeral: true })

  const added_list    = format_list(added, "[ + ]")
  const improved_list = format_list(improved, "[ / ]")
  const removed_list  = format_list(removed, "[ - ]")
  const fixed_list    = format_list(fixed, "[ ! ]")

  const changelog_components = [] as ReturnType<typeof component.text | typeof component.divider>[]

  if (added_list) {
    changelog_components.push(component.text(`### - Added:\n${added_list}`))
    changelog_components.push(component.divider(2))
  }

  if (removed_list) {
    changelog_components.push(component.text(`### - Deleted:\n${removed_list}`))
    changelog_components.push(component.divider(2))
  }

  if (fixed_list) {
    changelog_components.push(component.text(`### - Fixed:\n${fixed_list}`))
    changelog_components.push(component.divider(2))
  }

  if (improved_list) {
    changelog_components.push(component.text(`### - Improved:\n${improved_list}`))
  }

  if (changelog_components.length > 0 && changelog_components[changelog_components.length - 1].type === component.component_type.divider) {
    changelog_components.pop()
  }

  if (changelog_components.length === 0) {
    changelog_components.push(component.text("No changes specified."))
  }

  const role_mentions = (role_ids.length > 0 ? role_ids : [priority_role_id])
    .map(id => format.role_mention(id))
    .join(" ")

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              "## Atomicals Script Update Logs",
              role_mentions,
              `- **Place:** ${script}`,
              `- **Version:** v${version}`,
              "- **Developer Notes:**",
              "> Found any bugs or issues? Feel free to report them to the developers!",
              "> Got ideas or suggestions for new scripts? We'd love to hear them!",
            ],
            thumbnail: devlog_thumb_url,
          }),
        ],
      }),
      component.container({
        components: changelog_components,
      }),
      component.container({
        components: [
          component.action_row(
            component.link_button("Report Bugs", "https://discord.com/channels/1250337227582472243/1320078429110145114"),
            component.link_button("Suggest a Feature", "https://discord.com/channels/1250337227582472243/1351980309557542962"),
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
