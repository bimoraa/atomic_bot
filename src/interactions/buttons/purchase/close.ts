import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
} from "discord.js"
import { remove_open_ticket } from "./open"
import {
  purchase_owners,
  purchase_staff,
  purchase_logs,
  purchase_ticket_ids,
  purchase_claimed_by,
  purchase_open_time,
  purchase_log_channel_id,
  delete_purchase_ticket,
} from "../../shared/ticket_state"
import { component, time, api, format } from "../../../utils"

export async function handle_purchase_close(interaction: ButtonInteraction) {
  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({
      content: "This command can only be used in a ticket thread.",
      flags: 64,
    })
    return
  }

  await interaction.deferReply({ flags: 64 })

  const owner_id = purchase_owners.get(thread.id)
  const ticket_id = purchase_ticket_ids.get(thread.id) || "Unknown"
  const claimed_by = purchase_claimed_by.get(thread.id)
  const open_time = purchase_open_time.get(thread.id)
  const open_log_id = purchase_logs.get(thread.id)

  if (owner_id) {
    remove_open_ticket(owner_id)
    purchase_owners.delete(thread.id)
  }

  purchase_staff.delete(thread.id)
  purchase_logs.delete(thread.id)
  purchase_ticket_ids.delete(thread.id)
  purchase_claimed_by.delete(thread.id)
  purchase_open_time.delete(thread.id)

  await delete_purchase_ticket(thread.id)

  const timestamp = time.now()
  const token = api.get_token()

  const log_channel = interaction.client.channels.cache.get(purchase_log_channel_id) as TextChannel
  if (log_channel) {
    if (open_log_id) {
      await api.delete_message(log_channel.id, open_log_id, token)
    }

    let owner_avatar = format.default_avatar
    if (owner_id) {
      try {
        const owner = await interaction.client.users.fetch(owner_id)
        owner_avatar = owner.displayAvatarURL({ size: 128 })
      } catch {}
    }

    const log_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Purchase Ticket Closed`,
                `A purchase ticket has been closed.`,
              ],
              thumbnail: owner_avatar,
            }),
            component.divider(),
            component.text([
              `- **Ticket ID:** ${format.code(ticket_id)}`,
              `- **Opened By:** ${owner_id ? `<@${owner_id}>` : "Unknown"}`,
              `- **Closed By:** <@${interaction.user.id}>`,
            ]),
            component.divider(),
            component.text([
              `- **Open Time:** ${open_time ? time.full_date_time(open_time) : "Unknown"}`,
              `- **Claimed By:** ${claimed_by ? `<@${claimed_by}>` : "Not claimed"}`,
              `- **Reason:** -`,
            ]),
          ],
        }),
      ],
    })

    const log_data = await api.send_components_v2(log_channel.id, token, log_message)
    console.log("Close log response:", log_data)
  }

  if (owner_id) {
    try {
      const owner = await interaction.client.users.fetch(owner_id)
      const dm_channel = await owner.createDM()

      const dm_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## <:ticket:1411878131366891580> Purchase Ticket Closed`,
                ``,
                `Your purchase ticket has been closed.`,
                ``,
                `- **Ticket ID:** ${format.code(ticket_id)}`,
                `- **Closed by:** <@${interaction.user.id}>`,
                `- **Closed:** ${time.full_date_time(timestamp)}`,
                ``,
                `Thank you for using our service!`,
              ]),
              component.action_row(
                component.link_button("View Ticket", format.channel_url(interaction.guildId!, thread.id))
              ),
            ],
          }),
        ],
      })

      await api.send_components_v2(dm_channel.id, token, dm_message)
    } catch {}
  }

  await thread.setLocked(true)
  await thread.setArchived(true)

  await interaction.editReply({
    content: "Ticket closed.",
  })
}
