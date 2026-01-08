import { ButtonInteraction, GuildMember, VoiceChannel } from "discord.js"
import * as tempvoice                                   from "../../../services/tempvoice"
import * as voice_tracker                               from "../../../services/voice_time_tracker"
import * as voice_interaction                           from "../../../services/voice_interaction_tracker"
import { component, modal }                             from "../../../utils"

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

function create_not_owner_reply(message: string) {
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

function create_success_reply(message: string) {
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

function create_error_reply(message: string) {
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

export async function handle_tempvoice_name(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can rename the channel."),
      ephemeral: true,
    })
    return
  }

  const name_modal = modal.create_modal(
    "tempvoice_name_modal",
    "Rename Channel",
    modal.create_text_input({
      custom_id   : "channel_name",
      label       : "New Channel Name",
      placeholder : "Enter new channel name...",
      required    : true,
      max_length  : 100,
      value       : channel.name,
    }),
  )

  await interaction.showModal(name_modal)
}

export async function handle_tempvoice_limit(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can set the user limit."),
      ephemeral: true,
    })
    return
  }

  const limit_modal = modal.create_modal(
    "tempvoice_limit_modal",
    "Set User Limit",
    modal.create_text_input({
      custom_id   : "user_limit",
      label       : "User Limit (0 for unlimited)",
      placeholder : "Enter a number (0-99)...",
      required    : true,
      max_length  : 2,
      value       : String(channel.userLimit),
    }),
  )

  await interaction.showModal(limit_modal)
}

export async function handle_tempvoice_privacy(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can change privacy settings."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const everyone_perms = channel.permissionOverwrites.cache.get(channel.guild.roles.everyone.id)
  const is_private     = everyone_perms?.deny.has("Connect") || false

  const success = await tempvoice.set_privacy(channel, !is_private)

  if (success) {
    const message = !is_private
      ? "Channel is now **private**. Only trusted users can join."
      : "Channel is now **public**. Everyone can join."
    await interaction.editReply(create_success_reply(message))
  } else {
    await interaction.editReply(create_error_reply("Failed to change privacy settings."))
  }
}

export async function handle_tempvoice_waitingroom(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can toggle waiting room."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const is_enabled = await tempvoice.toggle_waiting_room(channel)

  const message = is_enabled
    ? "Waiting room is now **enabled**."
    : "Waiting room is now **disabled**."
  await interaction.editReply(create_success_reply(message))
}

export async function handle_tempvoice_chat(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can create a text channel."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const existing = tempvoice.get_text_channel_id(channel.id)
  if (existing) {
    await interaction.editReply(create_success_reply(`Text channel already exists: <#${existing}>`))
    return
  }

  const text_channel_id = await tempvoice.create_text_channel(channel, member)

  if (text_channel_id) {
    await interaction.editReply(create_success_reply(`Text channel created: <#${text_channel_id}>`))
  } else {
    await interaction.editReply(create_error_reply("Failed to create text channel."))
  }
}

export async function handle_tempvoice_trust(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can trust users."),
      ephemeral: true,
    })
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a user to trust:"),
          component.user_select("tempvoice_trust_select", "Select user to trust"),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_untrust(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can untrust users."),
      ephemeral: true,
    })
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a user to untrust:"),
          component.user_select("tempvoice_untrust_select", "Select user to untrust"),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_invite(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can invite users."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const suggested_users = await voice_interaction.get_suggested_users(
    member.id,
    guild_id,
    channel,
    25
  )

  const user_options = await Promise.all(
    suggested_users.slice(0, 25).map(async (user_id, index) => {
      try {
        const user = await interaction.client.users.fetch(user_id)
        const is_in_channel = channel.members.has(user_id)
        const description = is_in_channel ? "Currently in channel" : 
                          index < 5 ? "Frequently interacted" : ""
        const emoji_value = is_in_channel ? "🔊" : index < 5 ? "⭐" : undefined
        return {
          label      : user.username,
          value      : user_id,
          description: description,
          ...(emoji_value ? { emoji: { name: emoji_value } } : {}),
        }
      } catch (error) {
        return null
      }
    })
  )

  const valid_options = user_options.filter(opt => opt !== null)

  if (valid_options.length === 0) {
    await interaction.editReply(create_error_reply("No users available to invite."))
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            "Select a user to invite:",
            "-# ⭐ = Frequently interacted | 🔊 = Currently in channel",
          ]),
          component.divider(1),
          component.select_menu("tempvoice_invite_select", "Select user to invite", valid_options),
        ],
      }),
    ],
  })

  await interaction.editReply(reply)
}

export async function handle_tempvoice_kick(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can kick users."),
      ephemeral: true,
    })
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a user to kick:"),
          component.user_select("tempvoice_kick_select", "Select user to kick"),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_region(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can change the region."),
      ephemeral: true,
    })
    return
  }

  const region_options = [
    { label: "🔁 Automatic",     value: "auto",         description: "Let Discord choose the best region" },
    { label: "🇧🇷 Brazil",        value: "brazil",       description: "São Paulo, Brazil" },
    { label: "🇭🇰 Hong Kong",     value: "hongkong",     description: "Hong Kong" },
    { label: "🇮🇳 India",         value: "india",        description: "India" },
    { label: "🇯🇵 Japan",         value: "japan",        description: "Tokyo, Japan" },
    { label: "🇳🇱 Rotterdam",     value: "rotterdam",    description: "Rotterdam, Netherlands" },
    { label: "🇸🇬 Singapore",     value: "singapore",    description: "Singapore" },
    { label: "🇿🇦 South Africa",  value: "southafrica",  description: "Cape Town, South Africa" },
    { label: "🇰🇷 South Korea",   value: "south-korea",  description: "Seoul, South Korea" },
    { label: "🇦🇺 Sydney",        value: "sydney",       description: "Sydney, Australia" },
    { label: "🇺🇸 US Central",    value: "us-central",   description: "Dallas, United States" },
    { label: "🇺🇸 US East",       value: "us-east",      description: "New York, United States" },
    { label: "🇺🇸 US South",      value: "us-south",     description: "Miami, United States" },
    { label: "🇺🇸 US West",       value: "us-west",      description: "San Francisco, United States" },
  ]

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a voice region:"),
          component.divider(1),
          component.select_menu("tempvoice_region_select", "Select region...", region_options),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_block(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can block users."),
      ephemeral: true,
    })
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a user to block:"),
          component.user_select("tempvoice_block_select", "Select user to block"),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_unblock(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can unblock users."),
      ephemeral: true,
    })
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a user to unblock:"),
          component.user_select("tempvoice_unblock_select", "Select user to unblock"),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_claim(interaction: ButtonInteraction): Promise<void> {
  const member       = interaction.member as GuildMember
  const channel      = member.voice.channel as VoiceChannel
  const generator_id = tempvoice.get_generator_channel_id()
  const guild_id     = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    const reply = component.build_message({
      components: [
        component.container({
          components: [
            component.text("You must be in a temporary voice channel to claim it."),
            ...(generator_id ? [
              component.divider(1),
              component.action_row(
                component.link_button("Join Voice", `https://discord.com/channels/${guild_id}/${generator_id}`),
              ),
            ] : []),
          ],
        }),
      ],
    })
    await interaction.reply({ ...reply, ephemeral: true })
    return
  }

  if (tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_success_reply("You already own this channel."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const success = await tempvoice.claim_channel(channel, member)

  if (success) {
    await interaction.editReply(create_success_reply("You are now the owner of this channel!"))
  } else {
    await interaction.editReply(create_error_reply("Cannot claim this channel. The owner is still in the channel."))
  }
}

export async function handle_tempvoice_transfer(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can transfer ownership."),
      ephemeral: true,
    })
    return
  }

  const reply = component.build_message({
    components: [
      component.container({
        components: [
          component.text("Select a user to transfer ownership to:"),
          component.user_select("tempvoice_transfer_select", "Select new owner"),
        ],
      }),
    ],
  })

  await interaction.reply({ ...reply, ephemeral: true })
}

export async function handle_tempvoice_delete(interaction: ButtonInteraction): Promise<void> {
  const member   = interaction.member as GuildMember
  const channel  = member.voice.channel as VoiceChannel
  const guild_id = interaction.guildId!

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_not_in_channel_reply(guild_id, tempvoice.get_generator_channel_id()),
      ephemeral: true,
    })
    return
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_not_owner_reply("Only the channel owner can delete the channel."),
      ephemeral: true,
    })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const text_channel_id = tempvoice.get_text_channel_id(channel.id)
  if (text_channel_id) {
    const text_channel = channel.guild.channels.cache.get(text_channel_id)
    if (text_channel) {
      await text_channel.delete()
    }
  }

  tempvoice.cleanup_channel_data(channel.id)
  await channel.delete()

  await interaction.editReply(create_success_reply("Channel deleted.")).catch(() => {})
}

export async function handle_tempvoice_leaderboard(interaction: ButtonInteraction): Promise<void> {
  const guild_id    = interaction.guildId!
  const leaderboard = await voice_tracker.get_channel_leaderboard(guild_id, 10)

  if (leaderboard.length === 0) {
    await interaction.reply({
      content  : "No voice channel records found.",
      ephemeral: true,
    })
    return
  }

  const leaderboard_text = leaderboard.map((record, index) => {
    const medal    = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
    const duration = voice_tracker.format_time(record.duration_seconds)
    const status   = record.deleted_at ? "" : " (Active)"
    return `${medal} <@${record.owner_id}> - ${duration}${status}`
  })

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Voice Channel Duration Leaderboard`,
            ``,
            ...leaderboard_text,
          ]),
        ],
      }),
    ],
  })

  await interaction.reply({ ...message, ephemeral: true })
}
