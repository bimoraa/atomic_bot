import { ModalSubmitInteraction } from "discord.js"
import { publish_devlog }         from "../../controllers/devlog_controller"

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

  const added    = interaction.fields.getTextInputValue("added")
  const improved = interaction.fields.getTextInputValue("improved")
  const removed  = interaction.fields.getTextInputValue("removed")
  const fixed    = interaction.fields.getTextInputValue("fixed")

  await interaction.deferReply({ ephemeral: true })

  const result = await publish_devlog({
    client   : interaction.client,
    script,
    version,
    added,
    improved,
    removed,
    fixed,
    role_ids,
  })

  if (result.success) {
    await interaction.editReply({ content: result.message || "Devlog published successfully!" })
  } else {
    await interaction.editReply({ content: result.error || "Failed to publish devlog" })
  }

  return true
}
