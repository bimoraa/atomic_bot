import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  GuildMember,
} from "discord.js"
import { is_admin, is_staff } from "../permissions"
import {
  get_ticket_config,
  get_ticket,
  set_ticket,
  save_ticket,
} from "./state"
import { component, api, format } from "../../utils"

export async function claim_ticket(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.reply({ content: "Invalid ticket type.", flags: 64 })
    return
  }

  const member = interaction.member as GuildMember
  if (!is_admin(member) && !is_staff(member)) {
    await interaction.reply({ content: "Only staff can claim tickets.", flags: 64 })
    return
  }

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.reply({ content: "This can only be used in a ticket thread.", flags: 64 })
    return
  }

  const data = get_ticket(thread.id)
  if (!data) {
    await interaction.reply({ content: "Ticket data not found.", flags: 64 })
    return
  }

  if (data.claimed_by) {
    await interaction.reply({ content: `This ticket has already been claimed by <@${data.claimed_by}>.`, flags: 64 })
    return
  }

  await interaction.deferReply({ flags: 64 })

  await thread.members.add(interaction.user.id)
  data.claimed_by = interaction.user.id

  if (!data.staff.includes(interaction.user.id)) {
    data.staff.push(interaction.user.id)
  }

  set_ticket(thread.id, data)

  await thread.send({ content: `<@${interaction.user.id}> has claimed this ticket.` })

  const log_message_id = data.log_message_id
  const log_channel    = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel

  if (log_message_id && log_channel) {
    const staff_mentions = data.staff.map((id: string) => `<@${id}>`)

    try {
      const owner      = await interaction.guild?.members.fetch(data.owner_id).catch(() => null)
      const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

      let log_content = [
        `## Join Ticket`,
        `A ${config.name} Ticket is Opened!`,
        ``,
        `- **Ticket ID:** ${format.code(data.ticket_id)}`,
        `- **Opened by:** <@${data.owner_id}>`,
      ]

      if (data.issue_type) {
        log_content.push(`- **Issue:** ${data.issue_type}`)
      }

      log_content.push(`- **Claimed by:** <@${interaction.user.id}>`)

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: log_content,
                thumbnail: avatar_url,
              }),
              component.divider(),
              component.text([
                `- **Staff in Ticket:** ${staff_mentions.length}`,
                `- **Staff Members:** ${staff_mentions.join(" ") || "None"}`,
              ]),
              component.divider(),
              component.action_row(
                component.success_button("Join Ticket", `${config.prefix}_join_${thread.id}`)
              ),
            ],
          }),
        ],
      })

      await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
    } catch {}
  }

  await save_ticket(thread.id)

  await interaction.editReply({ content: "You have claimed this ticket." })
}
