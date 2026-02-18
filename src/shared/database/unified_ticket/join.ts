import { ButtonInteraction, GuildMember, TextChannel, ThreadChannel } from "discord.js"
import { is_admin, is_staff } from "../settings/permissions"
import {
  get_ticket_config,
  get_ticket,
  set_ticket,
  save_ticket,
  load_ticket,
  get_join_claim_cooldown_remaining_ms,
  activate_join_claim_cooldown,
  build_ticket_log_message,
} from "./state"
import { component, api, format } from "../../utils"

const __helper_role_id = "1357767950421065981"

export async function join_ticket(interaction: ButtonInteraction, ticket_type: string, thread_id: string): Promise<void> {
  await interaction.deferReply({ flags: 32832 } as any)

  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const member     = interaction.member as GuildMember
  const is_helper  = member.roles.cache.has(__helper_role_id)
  
  if (ticket_type === "helper") {
    if (!is_admin(member) && !is_staff(member) && !is_helper) {
      await interaction.editReply({ content: "Only staff and helpers can join helper tickets." })
      return
    }
  } else {
    if (!is_admin(member) && !is_staff(member)) {
      await interaction.editReply({ content: "Only staff can join tickets." })
      return
    }
  }

  const guild  = interaction.guild!
  const thread = guild.channels.cache.get(thread_id) as ThreadChannel

  if (!thread) {
    await interaction.editReply({ content: "Ticket thread not found." })
    return
  }

  const cooldown_remaining_ms = get_join_claim_cooldown_remaining_ms(interaction.user.id)
  if (cooldown_remaining_ms > 0) {
    const cooldown_remaining_sec = Math.ceil(cooldown_remaining_ms / 1000)
    await interaction.editReply({
      content: `Cooldown aktif. Tunggu ${cooldown_remaining_sec} detik sebelum join/claim ticket baru.`,
    })
    return
  }

  let data = get_ticket(thread_id)
  
  // - FALLBACK: LOAD FROM DATABASE - \\
  if (!data) {
    const loaded = await load_ticket(thread_id)
    if (!loaded) {
      await interaction.editReply({ content: "Ticket data not found." })
      return
    }
    data = get_ticket(thread_id)
    if (!data) {
      await interaction.editReply({ content: "Ticket data not found." })
      return
    }
  }

  if (data.staff.includes(member.id)) {
    const already_joined_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Already Joined`,
              `You have already joined this ticket.`,
            ]),
            component.action_row(
              component.link_button("Jump to Ticket", format.channel_url(interaction.guildId!, thread_id))
            ),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, already_joined_message)
    return
  }

  await thread.members.add(member.id)
  activate_join_claim_cooldown(interaction.user.id)

  data.staff.push(member.id)
  set_ticket(thread_id, data)

  const staff_mentions = data.staff.map((id: string) => `<@${id}>`)
  const log_message_id = data.log_message_id

  if (log_message_id) {
    const log_channel = guild.channels.cache.get(config.log_channel_id) as TextChannel
    if (log_channel) {
      try {
        const owner      = await guild.members.fetch(data.owner_id).catch(() => null)
        const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

        const description_block = data.description
          ? `- **Description:**\n> ${data.description}`
          : data.issue_type ? `- **Issue Type:** ${data.issue_type}` : null

        const message = build_ticket_log_message({
          config_name      : config.name,
          owner_id         : data.owner_id,
          claimed_by       : data.claimed_by || null,
          avatar_url       : avatar_url,
          description_block: description_block,
          staff            : data.staff,
          open_time        : data.open_time,
          join_button_id   : `${config.prefix}_join_${thread_id}`,
        })

        await api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
      } catch {}
    }
  }

  await save_ticket(thread_id)

  const reply_message = component.build_message({
    components: [
      component.container({
        components: [
          component.text(`You have joined the ticket!`),
          component.divider(2),
          component.action_row(
            component.link_button("Jump to Ticket", format.channel_url(guild.id, thread_id))
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, { ...reply_message, flags: 32832 })
}
