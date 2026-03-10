/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 临时语音面板按钮的交互注册 - \
// - registers temp voice panel button interactions - \
import { ButtonInteraction, GuildMember, VoiceChannel } from "discord.js"
import { ButtonHandler }                                from "@shared/types/interaction"
import { component, modal }                            from "@shared/utils"
import * as tempvoice                                  from "@shared/database/services/tempvoice"
import { get_channel_leaderboard, format_time }        from "@shared/database/trackers/voice_time_tracker"

async function get_owner_channel(interaction: ButtonInteraction): Promise<VoiceChannel | null> {
  const member = interaction.member as GuildMember
  if (!interaction.guild) return null
  return tempvoice.get_user_temp_channel(interaction.guild, member.id)
}

async function reply_error(interaction: ButtonInteraction, msg: string) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ content: msg })
  } else {
    await interaction.reply({ content: msg, flags: 64 })
  }
}

export const button: ButtonHandler = {
  custom_id: /^tempvoice_/,
  async execute(interaction: ButtonInteraction) {
    const action = interaction.customId.replace("tempvoice_", "")

    if (action === "name") {
      const rename_modal = modal.create_modal(
        "tempvoice_rename_modal",
        "Rename Voice Channel",
        modal.create_text_input({
          custom_id  : "new_name",
          label      : "New Channel Name",
          style      : "short",
          placeholder: "Enter new name",
          required   : true,
          min_length : 1,
          max_length : 100,
        })
      )
      await interaction.showModal(rename_modal)
      return
    }

    if (action === "limit") {
      const limit_modal = modal.create_modal(
        "tempvoice_limit_modal",
        "Set User Limit",
        modal.create_text_input({
          custom_id  : "user_limit",
          label      : "User Limit (0 = no limit)",
          style      : "short",
          placeholder: "e.g. 5",
          required   : true,
          min_length : 1,
          max_length : 2,
        })
      )
      await interaction.showModal(limit_modal)
      return
    }

    await interaction.deferReply({ flags: 64 })

    const channel = await get_owner_channel(interaction)

    if (action === "leaderboard") {
      const guild_id = interaction.guildId
      if (!guild_id) {
        await reply_error(interaction, "This can only be used in a server.")
        return
      }

      const records = await get_channel_leaderboard(guild_id, 10)

      if (records.length === 0) {
        await interaction.editReply({ content: "No voice channel data available yet." })
        return
      }

      const lines = records.map((r, i) =>
        `${i + 1}. <@${r.owner_id}> — ${format_time(r.duration_seconds)}`
      )

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text(["## Voice Channel Leaderboard", ...lines]),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
      return
    }

    if (!channel) {
      await reply_error(interaction, "You don't have an active temp voice channel.")
      return
    }

    if (action === "privacy") {
      const current_private = channel.permissionOverwrites.cache
        .get(interaction.guild!.roles.everyone.id)
        ?.deny.has("Connect") ?? false

      const success = await tempvoice.set_privacy(channel, !current_private)
      const label   = !current_private ? "private" : "public"
      await interaction.editReply({
        content: success
          ? `Channel is now **${label}**.`
          : "Failed to update privacy.",
      })
      return
    }

    if (action === "waitingroom") {
      const new_state = await tempvoice.toggle_waiting_room(channel)
      await interaction.editReply({
        content: `Waiting room is now **${new_state ? "enabled" : "disabled"}**.`,
      })
      return
    }

    if (action === "chat") {
      const thread_id = tempvoice.get_thread_id(channel.id)
      await interaction.editReply({
        content: thread_id
          ? `Your voice chat thread: <#${thread_id}>`
          : "No chat thread found for your channel.",
      })
      return
    }

    if (action === "trust") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to trust in your channel:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_trust_select:${channel.id}`,
                  placeholder: "Select user to trust",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "untrust") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to untrust:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_untrust_select:${channel.id}`,
                  placeholder: "Select user to untrust",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "invite") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to invite:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_invite_select:${channel.id}`,
                  placeholder: "Select user to invite",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "kick") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to kick:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_kick_select:${channel.id}`,
                  placeholder: "Select user to kick",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "block") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to block:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_block_select:${channel.id}`,
                  placeholder: "Select user to block",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "unblock") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to unblock:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_unblock_select:${channel.id}`,
                  placeholder: "Select user to unblock",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "transfer") {
      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Select a user to transfer ownership to:"),
              {
                type      : 1,
                components: [{
                  type       : 5,
                  custom_id  : `tempvoice_transfer_select:${channel.id}`,
                  placeholder: "Select new owner",
                  min_values : 1,
                  max_values : 1,
                }],
              },
            ],
          }),
        ],
      })
      await interaction.editReply(message)
      return
    }

    if (action === "claim") {
      const member  = interaction.member as GuildMember
      const success = await tempvoice.claim_channel(channel, member)
      await interaction.editReply({
        content: success
          ? "You have claimed ownership of this channel."
          : "Cannot claim this channel. The owner is still in the channel.",
      })
      return
    }

    if (action === "region") {
      const region_modal = modal.create_modal(
        "tempvoice_region_modal",
        "Set Voice Region",
        modal.create_text_input({
          custom_id  : "region",
          label      : "Region (leave empty for auto)",
          style      : "short",
          placeholder: "e.g. us-east, eu-central, singapore (or blank)",
          required   : false,
          max_length : 50,
        })
      )
      await interaction.showModal(region_modal)
      return
    }

    if (action === "delete") {
      const success = await tempvoice.delete_temp_channel(channel)
      await interaction.editReply({
        content: success
          ? "Your voice channel has been deleted."
          : "Failed to delete the channel.",
      })
    }
  },
}
