import { ButtonInteraction, ThreadChannel, GuildMember } from "discord.js"
import { component, api } from "../../../utils"
import { is_staff } from "../../../functions/permissions"
import {
  purchase_owners,
  purchase_ticket_parent_id,
  load_purchase_ticket,
  save_purchase_ticket,
} from "../../shared/ticket_state"

export async function handle_purchase_reopen(interaction: ButtonInteraction) {
  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember

  if (!thread.isThread() || thread.parentId !== purchase_ticket_parent_id) {
    await interaction.reply({
      content: "This button can only be used in a purchase ticket thread.",
      flags: 64,
    })
    return
  }

  if (!is_staff(member)) {
    await interaction.reply({
      content: "Only staff can reopen tickets.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  try {
    await thread.setArchived(false)
    await thread.setLocked(false)

    await load_purchase_ticket(thread.id)

    const owner_id = purchase_owners.get(thread.id)

    const reopen_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Ticket Reopened`,
              `This ticket has been reopened by <@${interaction.user.id}>.`,
            ]),
          ],
        }),
      ],
    })

    await api.send_components_v2(thread.id, api.get_token(), reopen_message)

    if (interaction.message) {
      try {
        await interaction.message.delete()
      } catch {}
    }

    await interaction.editReply({
      content: "Ticket reopened successfully.",
    })
  } catch (error) {
    await interaction.editReply({
      content: "Failed to reopen ticket.",
    })
  }
}
