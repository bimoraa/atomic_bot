import { ModalSubmitInteraction, GuildMember, VoiceChannel } from "discord.js"
import * as tempvoice                                        from "../../services/tempvoice"
import { component }                                         from "../../utils"

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

function create_not_in_channel_reply(guild_id: string, generator_channel_id: string | null) {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text("You must be in your temporary voice channel to use this."),
          ...(generator_channel_id ? [
            component.divider(1),
            component.action_row(
              component.link_button("Join Voice", `https://discord.com/channels/${guild_id}/${generator_channel_id}`),
            ),
          ] : []),
        ],
      }),
    ],
  })
}

export async function handle_tempvoice_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("tempvoice_")) return false

  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return true
  }

  if (interaction.customId === "tempvoice_name_modal") {
    await handle_name_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_limit_modal") {
    await handle_limit_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_trust_modal") {
    await handle_trust_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_untrust_modal") {
    await handle_untrust_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_invite_modal") {
    const user_id        = interaction.fields.getTextInputValue("user_id").trim()
    const invite_message = ""
    await handle_invite_with_message(interaction, channel, member, user_id, invite_message)
    return true
  }

  if (interaction.customId.startsWith("tempvoice_invite_message_")) {
    const user_id        = interaction.customId.replace("tempvoice_invite_message_", "")
    const invite_message = interaction.fields.getTextInputValue("invite_message").trim()
    await handle_invite_with_message(interaction, channel, member, user_id, invite_message)
    return true
  }

  if (interaction.customId === "tempvoice_kick_modal") {
    await handle_kick_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_region_modal") {
    await handle_region_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_block_modal") {
    await handle_block_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_unblock_modal") {
    await handle_unblock_modal(interaction, channel, member)
    return true
  }

  if (interaction.customId === "tempvoice_transfer_modal") {
    await handle_transfer_modal(interaction, channel, member)
    return true
  }

  return false
}

async function handle_name_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can rename the channel."),
      ephemeral: true,
    })
    return
  }

  const new_name = interaction.fields.getTextInputValue("channel_name")

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.rename_channel(channel, new_name)

  if (success) {
    await interaction.editReply(create_reply(`Channel renamed to **${new_name}**.`))
  } else {
    await interaction.editReply(create_reply("Failed to rename channel."))
  }
}

async function handle_limit_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can set the user limit."),
      ephemeral: true,
    })
    return
  }

  const limit_str = interaction.fields.getTextInputValue("user_limit")
  const limit     = parseInt(limit_str, 10)

  if (isNaN(limit) || limit < 0 || limit > 99) {
    await interaction.reply({
      ...create_reply("Please enter a valid number between 0 and 99."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.set_user_limit(channel, limit)

  if (success) {
    const message = limit === 0
      ? "User limit removed (unlimited)."
      : `User limit set to **${limit}**.`
    await interaction.editReply(create_reply(message))
  } else {
    await interaction.editReply(create_reply("Failed to set user limit."))
  }
}

async function handle_invite_with_message(
  interaction      : ModalSubmitInteraction,
  channel          : VoiceChannel,
  member           : GuildMember,
  user_id          : string,
  invite_message   : string
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can invite users."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const target = await channel.guild.members.fetch(user_id).catch(() => null)

  if (!target) {
    await interaction.editReply(create_reply("User not found."))
    return
  }

  const success = await tempvoice.invite_user(channel, user_id)

  if (!success) {
    await interaction.editReply(create_reply("Failed to invite user."))
    return
  }

  if (invite_message) {
    try {
      const dm_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## Voice Channel Invitation`,
                `<@${member.id}> invited you to join their voice channel.`,
                ``,
                `**Message:** ${invite_message}`,
              ]),
              component.divider(1),
              component.action_row(
                component.link_button("Join Channel", `https://discord.com/channels/${channel.guild.id}/${channel.id}`),
              ),
            ],
          }),
        ],
      })

      await target.send(dm_message).catch(() => {})
    } catch {}
  }

  const confirmation_text = invite_message
    ? `<@${user_id}> has been invited with your message.`
    : `<@${user_id}> has been invited to the channel.`

  await interaction.editReply(create_reply(confirmation_text))
}

async function handle_trust_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can trust users."),
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.fields.getTextInputValue("user_id").trim()

  await interaction.deferReply({ ephemeral: true })

  const target = await channel.guild.members.fetch(user_id).catch(() => null)

  if (!target) {
    await interaction.editReply(create_reply("User not found."))
    return
  }

  const success = await tempvoice.trust_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> is now trusted.`))
  } else {
    await interaction.editReply(create_reply("Failed to trust user."))
  }
}

async function handle_untrust_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can untrust users."),
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.fields.getTextInputValue("user_id").trim()

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.untrust_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> is no longer trusted.`))
  } else {
    await interaction.editReply(create_reply("Failed to untrust user."))
  }
}

async function handle_kick_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can kick users."),
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.fields.getTextInputValue("user_id").trim()

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.kick_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> has been kicked from the channel.`))
  } else {
    await interaction.editReply(create_reply("User not found in channel or failed to kick."))
  }
}

async function handle_region_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can change the region."),
      ephemeral: true,
    })
    return
  }

  const region = interaction.fields.getTextInputValue("region").trim() || null

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.set_region(channel, region)

  if (success) {
    const message = region
      ? `Voice region set to **${region}**.`
      : "Voice region set to **automatic**."
    await interaction.editReply(create_reply(message))
  } else {
    await interaction.editReply(create_reply("Failed to set region. Make sure the region name is valid."))
  }
}

async function handle_block_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can block users."),
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.fields.getTextInputValue("user_id").trim()

  await interaction.deferReply({ ephemeral: true })

  const target = await channel.guild.members.fetch(user_id).catch(() => null)

  if (!target) {
    await interaction.editReply(create_reply("User not found."))
    return
  }

  const success = await tempvoice.block_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> has been blocked from the channel.`))
  } else {
    await interaction.editReply(create_reply("Failed to block user."))
  }
}

async function handle_unblock_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can unblock users."),
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.fields.getTextInputValue("user_id").trim()

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.unblock_user(channel, user_id)

  if (success) {
    await interaction.editReply(create_reply(`<@${user_id}> has been unblocked.`))
  } else {
    await interaction.editReply(create_reply("Failed to unblock user."))
  }
}

async function handle_transfer_modal(
  interaction : ModalSubmitInteraction,
  channel     : VoiceChannel,
  member      : GuildMember
): Promise<void> {
  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can transfer ownership."),
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.fields.getTextInputValue("user_id").trim()

  await interaction.deferReply({ ephemeral: true })

  const target = await channel.guild.members.fetch(user_id).catch(() => null)

  if (!target) {
    await interaction.editReply(create_reply("User not found."))
    return
  }

  if (target.id === member.id) {
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
