import { ButtonInteraction, ThreadChannel, GuildMember } from "discord.js"
import { is_staff, is_admin } from "../../settings/permissions"
import {
  get_ticket_config,
  load_ticket,
} from "../state"
import { component, api } from "../../../utils"

const __helper_role_id = "1357767950421065981"

export async function reopen_ticket(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  await interaction.deferReply({ flags: 64 })

  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const thread    = interaction.channel as ThreadChannel
  const member    = interaction.member as GuildMember
  const is_helper = member.roles.cache.has(__helper_role_id)

  if (!thread.isThread() || thread.parentId !== config.ticket_parent_id) {
    await interaction.editReply({ content: `This button can only be used in a ${config.name.toLowerCase()} ticket thread.` })
    return
  }

  if (ticket_type === "helper") {
    if (!is_admin(member) && !is_staff(member) && !is_helper) {
      await interaction.editReply({ content: "Only staff and helpers can reopen helper tickets." })
      return
    }
  } else {
    if (!is_staff(member)) {
      await interaction.editReply({ content: "Only staff can reopen tickets." })
      return
    }
  }

  try {
    await thread.setArchived(false)
    await thread.setLocked(false)

    await load_ticket(thread.id)

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

    await interaction.editReply({ content: "Ticket reopened successfully." })
  } catch (error) {
    await interaction.editReply({ content: "Failed to reopen ticket." })
  }
}
