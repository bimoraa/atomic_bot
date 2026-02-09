import { UserSelectMenuInteraction, GuildMember, VoiceChannel, StringSelectMenuInteraction } from "discord.js"
import * as tempvoice                                           from "@shared/database/services/tempvoice"
import * as voice_interaction                                   from "@shared/database/trackers/voice_interaction_tracker"
import { component, modal }                                     from "@shared/utils"

function create_reply(message: string) {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text(message),
        ],
      }),
    ],
  })
}

export async function handle_tempvoice_user_select(interaction: UserSelectMenuInteraction | StringSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("tempvoice_")) return false

  const member  = interaction.member as GuildMember
  const channel = member.voice.channel as VoiceChannel

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_reply("You must be in your temporary voice channel to use this."),
      ephemeral: true,
    })
    return true
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can use this."),
      ephemeral: true,
    })
    return true
  }

  const selected_user_id = interaction.values[0]
  const guild_id         = interaction.guildId!

  if (interaction.customId === "tempvoice_trust_select") {
    await handle_trust_select(interaction, channel, selected_user_id, member.id, guild_id)
    return true
  }

  if (interaction.customId === "tempvoice_untrust_select") {
    await handle_untrust_select(interaction, channel, selected_user_id, member.id, guild_id)
    return true
  }

  if (interaction.customId === "tempvoice_invite_select") {
    await handle_invite_select(interaction, channel, selected_user_id, member.id, guild_id)
    return true
  }

  if (interaction.customId === "tempvoice_kick_select") {
    await handle_kick_select(interaction, channel, selected_user_id, member.id, guild_id)
    return true
  }

  if (interaction.customId === "tempvoice_block_select") {
    await handle_block_select(interaction, channel, selected_user_id, member.id, guild_id)
    return true
  }

  if (interaction.customId === "tempvoice_unblock_select") {
    await handle_unblock_select(interaction, channel, selected_user_id, member.id, guild_id)
    return true
  }

  if (interaction.customId === "tempvoice_transfer_select") {
    if (interaction.isUserSelectMenu()) {
      await handle_transfer_select(interaction, channel, selected_user_id, member)
    }
    return true
  }

  return false
}

async function handle_trust_select(
  interaction : UserSelectMenuInteraction | StringSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  owner_id    : string,
  guild_id    : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.trust_user(channel, user_id)

  if (success) {
    await voice_interaction.track_interaction(owner_id, user_id, guild_id, "trust")
    await interaction.editReply(create_reply(`<@${user_id}> is now trusted.`))
  } else {
    await interaction.editReply(create_reply("Failed to trust user."))
  }
}

async function handle_untrust_select(
  interaction : UserSelectMenuInteraction | StringSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  owner_id    : string,
  guild_id    : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.untrust_user(channel, user_id)

  if (success) {
    await voice_interaction.track_interaction(owner_id, user_id, guild_id, "untrust")
    await interaction.editReply(create_reply(`<@${user_id}> is no longer trusted.`))
  } else {
    await interaction.editReply(create_reply("Failed to untrust user."))
  }
}

async function handle_invite_select(
  interaction : UserSelectMenuInteraction | StringSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  owner_id    : string,
  guild_id    : string
): Promise<void> {
  await voice_interaction.track_interaction(owner_id, user_id, guild_id, "invite")
  
  const invite_modal = modal.create_modal(
    `tempvoice_invite_message_${user_id}`,
    "Invite User",
    modal.create_text_input({
      custom_id   : "invite_message",
      label       : "Message (Optional)",
      placeholder : "Enter a message to send with the invite...",
      required    : false,
      max_length  : 200,
      style       : "paragraph",
    }),
  )

  await interaction.showModal(invite_modal)
}

async function handle_kick_select(
  interaction : UserSelectMenuInteraction | StringSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  owner_id    : string,
  guild_id    : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.kick_user(channel, user_id)

  if (success) {
    await voice_interaction.track_interaction(owner_id, user_id, guild_id, "kick")
    await interaction.editReply(create_reply(`<@${user_id}> has been kicked from the channel.`))
  } else {
    await interaction.editReply(create_reply("User not found in channel or failed to kick."))
  }
}

async function handle_block_select(
  interaction : UserSelectMenuInteraction | StringSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  owner_id    : string,
  guild_id    : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.block_user(channel, user_id)

  if (success) {
    await voice_interaction.track_interaction(owner_id, user_id, guild_id, "block")
    await interaction.editReply(create_reply(`<@${user_id}> has been blocked from the channel.`))
  } else {
    await interaction.editReply(create_reply("Failed to block user."))
  }
}

async function handle_unblock_select(
  interaction : UserSelectMenuInteraction | StringSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  owner_id    : string,
  guild_id    : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.unblock_user(channel, user_id)

  if (success) {
    await voice_interaction.track_interaction(owner_id, user_id, guild_id, "unblock")
    await interaction.editReply(create_reply(`<@${user_id}> has been unblocked.`))
  } else {
    await interaction.editReply(create_reply("Failed to unblock user."))
  }
}

async function handle_transfer_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string,
  member      : GuildMember
): Promise<void> {
  await interaction.deferUpdate()

  if (user_id === member.id) {
    await interaction.editReply(create_reply("You cannot transfer ownership to yourself."))
    return
  }

  const success = await tempvoice.transfer_ownership(channel, member, user_id)

  if (success) {
    await interaction.editReply(create_reply(`Ownership transferred to <@${user_id}>.`))
  } else {
    await interaction.editReply(create_reply("Failed to transfer ownership."))
  }
}
