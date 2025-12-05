import { ButtonInteraction, GuildMember, TextChannel, ThreadChannel } from "discord.js"
import { ticket_logs, ticket_staff, ticket_avatars, log_channel_id } from "../../shared/ticket_state"
import { component, api } from "../../../utils"

export async function handle(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("join_ticket_")) return false

  await interaction.deferReply({ ephemeral: true })

  const thread_id = interaction.customId.replace("join_ticket_", "")
  const member = interaction.member as GuildMember
  const guild = interaction.guild!

  const thread = guild.channels.cache.get(thread_id) as ThreadChannel
  if (!thread) {
    await interaction.editReply({ content: "Ticket thread not found." })
    return true
  }

  await thread.members.add(member.id)

  let staff_list = ticket_staff.get(thread_id) || []
  if (!staff_list.includes(member.id)) {
    staff_list.push(member.id)
    ticket_staff.set(thread_id, staff_list)
  }

  const staff_mentions = staff_list.map((id: string) => `<@${id}>`)

  const log_message_id = ticket_logs.get(thread_id)
  const avatar_url = ticket_avatars.get(thread_id) || "https://cdn.discordapp.com/embed/avatars/0.png"

  if (log_message_id) {
    const log_channel = guild.channels.cache.get(log_channel_id) as TextChannel
    if (log_channel) {
      try {
        const message = await log_channel.messages.fetch(log_message_id)
        const original_content =
          (message as any).components?.[0]?.components?.[0]?.components?.[0]?.content || ""

        const payload = component.build_message({
          components: [
            component.container({
              components: [
                component.section({
                  content: original_content,
                  thumbnail: avatar_url,
                }),
                component.divider(),
                component.text([
                  `- Staff in Ticket: ${staff_mentions.length}`,
                  `- Staff Members: ${staff_mentions.join(", ") || "None"}`,
                ]),
                component.action_row(component.success_button("Join Ticket", `join_ticket_${thread_id}`)),
              ],
            }),
          ],
        })

        await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), payload)
      } catch {}
    }
  }

  await interaction.editReply({ content: `You have joined the ticket! <#${thread_id}>` })
  return true
}
