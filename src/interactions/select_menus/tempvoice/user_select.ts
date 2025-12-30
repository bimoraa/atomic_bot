import { UserSelectMenuInteraction, GuildMember, VoiceChannel } from "discord.js"
import * as tempvoice                                           from "../../../services/tempvoice"
import { component }                                            from "../../../utils"

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

export async function handle_tempvoice_user_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
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

  if (interaction.customId === "tempvoice_trust_select") {
    await handle_trust_select(interaction, channel, selected_user_id)
    return true
  }

  if (interaction.customId === "tempvoice_untrust_select") {
    await handle_untrust_select(interaction, channel, selected_user_id)
    return true
  }

  if (interaction.customId === "tempvoice_invite_select") {
    await handle_invite_select(interaction, channel, selected_user_id)
    return true
  }

  if (interaction.customId === "tempvoice_kick_select") {
    await handle_kick_select(interaction, channel, selected_user_id)
    return true
  }

  if (interaction.customId === "tempvoice_block_select") {
    await handle_block_select(interaction, channel, selected_user_id)
    return true
  }

  if (interaction.customId === "tempvoice_unblock_select") {
    await handle_unblock_select(interaction, channel, selected_user_id)
    return true
  }

  if (interaction.customId === "tempvoice_transfer_select") {
    await handle_transfer_select(interaction, channel, selected_user_id, member)
    return true
  }

  return false
}

async function handle_trust_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.trust_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> is now trusted.`))
  } else {
    await interaction.editReply(create_reply("Failed to trust user."))
  }
}

async function handle_untrust_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.untrust_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> is no longer trusted.`))
  } else {
    await interaction.editReply(create_reply("Failed to untrust user."))
  }
}

async function handle_invite_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.invite_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> has been invited to the channel.`))
  } else {
    await interaction.editReply(create_reply("Failed to invite user."))
  }
}

async function handle_kick_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.kick_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> has been kicked from the channel.`))
  } else {
    await interaction.editReply(create_reply("User not found in channel or failed to kick."))
  }
}

async function handle_block_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.block_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> has been blocked from the channel.`))
  } else {
    await interaction.editReply(create_reply("Failed to block user."))
  }
}

async function handle_unblock_select(
  interaction : UserSelectMenuInteraction,
  channel     : VoiceChannel,
  user_id     : string
): Promise<void> {
  await interaction.deferUpdate()

  const success = await tempvoice.unblock_user(channel, user_id)

  if (success) {
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
