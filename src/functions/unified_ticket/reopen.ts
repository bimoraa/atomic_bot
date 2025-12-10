import { ButtonInteraction, ThreadChannel, GuildMember } from "discord.js"
import { is_staff } from "../permissions"
import {
  get_ticket_config,
  get_ticket,
  load_ticket,
} from "./state"
import { component, api } from "../../utils"

export async function reopen_ticket(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.reply({ content: "Invalid ticket type.", flags: 64 })
    return
  }

  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember

  if (!thread.isThread() || thread.parentId !== config.ticket_parent_id) {
    await interaction.reply({ content: `This button can only be used in a ${config.name.toLowerCase()} ticket thread.`, flags: 64 })
    return
  }

  if (!is_staff(member)) {
    await interaction.reply({ content: "Only staff can reopen tickets.", flags: 64 })
    return
  }

  await interaction.deferReply({ flags: 64 })

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
