/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import {
  ButtonInteraction,
  TextChannel,
  ThreadChannel,
  GuildMember,
} from "discord.js"
import { is_admin, is_staff }        from "@database/settings/permissions"
import { member_has_role }             from "@utils/discord_api"
import {
  get_ticket_config,
  get_ticket,
  set_ticket,
  save_ticket,
  load_ticket,
  get_join_claim_cooldown_remaining_ms,
  activate_join_claim_cooldown,
  build_ticket_log_message,
}                                    from "@database/unified_ticket/state"
import { component, api, format }    from "@utils"

const __helper_role_id    = "1357767950421065981"

// - per-thread mutex: blocks concurrent claims on the same ticket before any await - \\
const __claiming_threads  = new Set<string>()

export async function claim_ticket(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  const thread_id = interaction.channelId

  // - synchronous lock — JS single-thread guarantees no interleaving between has() and add() - \\
  if (__claiming_threads.has(thread_id)) {
    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Claim In Progress",
                "Another staff member is already claiming this ticket. Please wait a moment.",
              ]),
            ],
          }),
        ],
      }),
      ephemeral: true,
    })
    return
  }

  __claiming_threads.add(thread_id)

  try {
  await interaction.deferReply({ flags: 64 })

  const config = get_ticket_config(ticket_type)
  if (!config) {
    await interaction.editReply({ content: "Invalid ticket type." })
    return
  }

  const member = interaction.member as GuildMember
  const is_helper = member_has_role(member, __helper_role_id)

  if (ticket_type === "helper") {
    if (!is_admin(member) && !is_staff(member) && !is_helper) {
      await interaction.editReply({ content: "Only staff and helpers can claim helper tickets." })
      return
    }
  } else {
    if (!is_admin(member) && !is_staff(member)) {
      await interaction.editReply({ content: "Only staff can claim tickets." })
      return
    }
  }

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return
  }

  const cooldown_remaining_ms = get_join_claim_cooldown_remaining_ms(interaction.user.id)
  if (cooldown_remaining_ms > 0) {
    const cooldown_remaining_sec = Math.ceil(cooldown_remaining_ms / 1000)
    await interaction.editReply({
      ...component.build_message({
        components: [
          component.container({
            components: [
              component.text([`**Cooldown Active**`, `Please wait **${cooldown_remaining_sec} seconds** before joining or claiming another ticket.`])
            ]
          })
        ]
      })
    })
    return
  }

  // - 立即激活冷却时间以防止竞争条件 - \\
  // - activate cooldown immediately to prevent race conditions - \\
  activate_join_claim_cooldown(interaction.user.id)

  let data = get_ticket(thread.id)

  // - 回退：从数据库加载 - \\
  // - fallback: load from database - \\
  if (!data) {
    const loaded = await load_ticket(thread.id)
    if (!loaded) {
      await interaction.editReply({ content: "Ticket data not found." })
      return
    }
    data = get_ticket(thread.id)
    if (!data) {
      await interaction.editReply({ content: "Ticket data not found." })
      return
    }
  }

  if (data.claimed_by) {
    await interaction.editReply({ content: `This ticket has already been claimed by <@${data.claimed_by}>.` })
    return
  }

  await thread.members.add(interaction.user.id)
  data.claimed_by = interaction.user.id

  if (!data.staff.includes(interaction.user.id)) {
    data.staff.push(interaction.user.id)
  }

  set_ticket(thread.id, data)

  // - 并行操作 - \\
  // - parallel operations - \\
  const parallel_tasks: Promise<any>[] = [
    thread.send({ content: `<@${interaction.user.id}> has claimed this ticket.` }).catch(() => { })
  ]

  const log_message_id = data.log_message_id
  const log_channel = interaction.client.channels.cache.get(config.log_channel_id) as TextChannel

  if (log_message_id && log_channel) {
    const staff_mentions = data.staff.map((id: string) => `<@${id}>`)

    const update_task = interaction.guild?.members.fetch(data.owner_id)
    if (update_task) {
      const task_promise = update_task
        .then(owner => {
          const avatar_url = owner?.displayAvatarURL({ size: 128 }) || format.default_avatar

          const description_block = data.description
            ? `- **Description:**\n> ${data.description}`
            : data.issue_type ? `- **Issue Type:** ${data.issue_type}` : null

          const message = build_ticket_log_message({
            config_name: config.name,
            owner_id: data.owner_id,
            claimed_by: interaction.user.id,
            avatar_url: avatar_url,
            description_block: description_block,
            staff: data.staff,
            open_time: data.open_time,
            join_button_id: `${config.prefix}_join_${thread.id}`,
          })

          return api.edit_components_v2(log_channel.id, log_message_id, api.get_token(), message)
        })
        .catch(() => { })

      parallel_tasks.push(task_promise)
    }
  }

  // - no await for faster response - \\
  save_ticket(thread.id)
  interaction.editReply({ content: "You have claimed this ticket." })

  // - wait for parallel tasks in background - \\
  Promise.allSettled(parallel_tasks).catch(() => { })

  } finally {
    // - release per-thread lock after claim resolves - \\
    __claiming_threads.delete(thread_id)
  }
}
