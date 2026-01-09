import { ModalSubmitInteraction, ButtonInteraction } from "discord.js"
import { open_ticket } from "../../../../shared/database/unified_ticket"

export async function handle(interaction: ModalSubmitInteraction) {
  if (!interaction.customId.startsWith("priority_modal_")) return false

  const issue_type  = interaction.customId.replace("priority_modal_", "")
  const description = interaction.fields.getTextInputValue("ticket_description")

  await open_ticket({
    interaction:  interaction as unknown as ButtonInteraction,
    ticket_type:  "priority",
    issue_type:   issue_type,
    description:  description,
  })

  return true
}
