import { StringSelectMenuInteraction, GuildMember } from "discord.js"
import { has_priority_role, priority_role_id } from "../../shared/ticket_state"
import { modal } from "../../../utils"

export async function handle(interaction: StringSelectMenuInteraction) {
  if (interaction.customId !== "ticket_select") return false

  const member = interaction.member as GuildMember

  if (!has_priority_role(member)) {
    await interaction.reply({
      content: `You need the <@&${priority_role_id}> role to create a ticket.`,
      ephemeral: true,
    })
    return true
  }

  const issue_type = interaction.values[0]

  const ticket_modal = modal.create_modal(
    `ticket_modal_${issue_type}`,
    "Create Ticket",
    modal.create_text_input({
      custom_id: "ticket_description",
      label: "Describe your issue",
      style: "paragraph",
      placeholder: "Please explain your issue in detail...",
      required: true,
      max_length: 1000,
    })
  )

  await interaction.showModal(ticket_modal)
  return true
}
