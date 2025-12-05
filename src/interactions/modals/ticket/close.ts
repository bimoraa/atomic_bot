import { ModalSubmitInteraction, ThreadChannel, TextChannel, GuildMember } from "discord.js"
import {
  ticket_logs,
  ticket_staff,
  ticket_avatars,
  ticket_owners,
  ticket_issues,
  ticket_descriptions,
  log_channel_id,
  closed_log_channel_id,
} from "../../shared/ticket_state"
import { component, api, time, format } from "../../../utils"

export async function handle(interaction: ModalSubmitInteraction) {
  if (interaction.customId !== "close_ticket_modal") return false

  const thread        = interaction.channel as ThreadChannel
  const guild         = interaction.guild!
  const closed_by     = interaction.member as GuildMember
  const close_reason  = interaction.fields.getTextInputValue("close_reason")

  const log_message_id = ticket_logs.get(thread.id)
  const owner_id = ticket_owners.get(thread.id) || closed_by.id
  const issue = ticket_issues.get(thread.id) || "Not specified"
  const description = ticket_descriptions.get(thread.id) || "No description provided"
  const staff_list = ticket_staff.get(thread.id) || []

  await interaction.reply({ content: "Closing ticket in 5 seconds..." })

  setTimeout(async () => {
    try {
      if (log_message_id) {
        const log_channel = guild.channels.cache.get(log_channel_id) as TextChannel
        if (log_channel) {
          try {
            await log_channel.messages.delete(log_message_id)
          } catch {}
        }
      }

      const closed_log_channel = guild.channels.cache.get(closed_log_channel_id) as TextChannel
      if (closed_log_channel) {
        const unix_timestamp = time.now()
        const staff_mentions = staff_list.map((id: string) => `<@${id}>`).join(", ") || "None"

        const message = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content: [
                    `## Ticket Closed`,
                    `A Priority Support Ticket has been closed.`,
                  ],
                  thumbnail: format.logo_url,
                }),
                component.divider(),
                component.text([
                  `**Ticket Information**`,
                  `- Ticket: \`${thread.name}\``,
                  `- Issue: ${issue}`,
                  `- Detail Issue: ${description}`,
                  ``,
                  `**User Information**`,
                  `- Opened By: <@${owner_id}>`,
                  `- Closed By: <@${closed_by.id}>`,
                  ``,
                  `**Close Details**`,
                  `- Closed At: ${time.full_date_time(unix_timestamp)}`,
                  `- Close Reason: ${close_reason}`,
                  `- Staff Involved: ${staff_mentions}`,
                ]),
                component.divider(),
                component.action_row(
                  component.link_button("View Thread", format.channel_url(guild.id, thread.id))
                ),
              ],
            }),
          ],
        })

        await api.send_components_v2(closed_log_channel.id, api.get_token(), message)
      }

      ticket_logs.delete(thread.id)
      ticket_staff.delete(thread.id)
      ticket_avatars.delete(thread.id)
      ticket_owners.delete(thread.id)
      ticket_issues.delete(thread.id)
      ticket_descriptions.delete(thread.id)

      const members = await thread.members.fetch()
      for (const [member_id] of members) {
        if (member_id !== interaction.client.user?.id) {
          try {
            await thread.members.remove(member_id)
          } catch {}
        }
      }

      await thread.setLocked(true)
    } catch {}
  }, 5000)

  return true
}
