import {
  Client,
  Message,
  AuditLogEvent,
  GuildMember,
  VoiceState,
  GuildBan,
  Role,
  GuildChannel,
  TextChannel,
  Collection,
  Snowflake,
  GuildEmoji,
  Sticker,
  Invite,
  ThreadChannel,
}                      from "discord.js"
import { logger, component } from "../utils"

const log            = logger.create_logger("audit_log")
const LOG_CHANNEL_ID = "1452086939866894420"

const COLOR = {
  MESSAGE   : 0x5865F2,
  MEMBER    : 0x57F287,
  MODERATION: 0xED4245,
  CHANNEL   : 0xFEE75C,
  ROLE      : 0xEB459E,
  VOICE     : 0x9B59B6,
  EMOJI     : 0xF1C40F,
  STICKER   : 0xE67E22,
  INVITE    : 0x3498DB,
  THREAD    : 0x1ABC9C,
}

async function send_log(client: Client, log_message: any): Promise<void> {
  try {
    const log_channel = await client.channels.fetch(LOG_CHANNEL_ID) as TextChannel
    if (!log_channel || !log_channel.isTextBased()) return

    await log_channel.send(log_message)
  } catch (error) {
    log.error("Failed to send audit log:", error)
  }
}

export function register_audit_logs(client: Client): void {
  client.on("messageUpdate", async (old_message, new_message) => {
    if (!old_message.guild || old_message.author?.bot) return
    if (old_message.content === new_message.content) return

    const avatar_url = old_message.author?.displayAvatarURL({ size: 512 }) || ""

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MESSAGE,
          components: [
            component.section({
              content   : "### Message Edited",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Author: <@${old_message.author?.id}>`,
              `- Channel: <#${old_message.channel.id}>`,
              `- Before: ${old_message.content || "(empty)"}`,
              `- After: ${new_message.content || "(empty)"}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("messageDelete", async (message) => {
    if (!message.guild || message.author?.bot) return

    const avatar_url = message.author?.displayAvatarURL({ size: 512 }) || ""

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MESSAGE,
          components: [
            component.section({
              content   : "### Message Deleted",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Author: <@${message.author?.id}>`,
              `- Channel: <#${message.channel.id}>`,
              `- Content: ${message.content || "(empty)"}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildMemberAdd", async (member) => {
    const avatar_url = member.user.displayAvatarURL({ size: 512 })

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MEMBER,
          components: [
            component.section({
              content   : "### Member Joined",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${member.id}>`,
              `- Account Created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildMemberRemove", async (member) => {
    const avatar_url = member.user.displayAvatarURL({ size: 512 })

    let kick_info = ""
    try {
      const audit_logs = await member.guild.fetchAuditLogs({
        type   : AuditLogEvent.MemberKick,
        limit  : 1,
      })
      const kick_log = audit_logs.entries.first()
      if (kick_log && kick_log.target?.id === member.id && Date.now() - kick_log.createdTimestamp < 5000) {
        kick_info = `\n- Kicked by: <@${kick_log.executor?.id}>`
        if (kick_log.reason) kick_info += `\n- Reason: ${kick_log.reason}`
      }
    } catch {}

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MEMBER,
          components: [
            component.section({
              content   : "### Member Left",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${member.id}>`,
              `- Roles: ${member.roles.cache.map(r => r.name).join(", ") || "None"}${kick_info}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildMemberUpdate", async (old_member, new_member) => {
    const old_roles = old_member.roles.cache.map(r => r.name).sort()
    const new_roles = new_member.roles.cache.map(r => r.name).sort()

    if (JSON.stringify(old_roles) !== JSON.stringify(new_roles)) {
      const added   = new_roles.filter(r => !old_roles.includes(r))
      const removed = old_roles.filter(r => !new_roles.includes(r))

      const changes = []
      if (added.length > 0) changes.push(`Added: ${added.join(", ")}`)
      if (removed.length > 0) changes.push(`Removed: ${removed.join(", ")}`)

      const avatar_url = new_member.user.displayAvatarURL({ size: 512 })

      let executor_text = "Unknown"
      try {
        const audit_logs = await new_member.guild.fetchAuditLogs({
          type   : AuditLogEvent.MemberRoleUpdate,
          limit  : 1,
        })
        const role_log = audit_logs.entries.first()
        if (role_log && role_log.target?.id === new_member.id) {
          executor_text = `<@${role_log.executor?.id}>`
        }
      } catch {}

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.MEMBER,
            components: [
              component.section({
                content   : "### Member Roles Updated",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${new_member.id}>`,
                `- Updated by: ${executor_text}`,
                `- Changes: ${changes.join(" | ")}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_member.nickname !== new_member.nickname) {
      const avatar_url = new_member.user.displayAvatarURL({ size: 512 })

      let executor_text = "Self"
      try {
        const audit_logs = await new_member.guild.fetchAuditLogs({
          type   : AuditLogEvent.MemberUpdate,
          limit  : 1,
        })
        const nick_log = audit_logs.entries.first()
        if (nick_log && nick_log.target?.id === new_member.id && nick_log.executor?.id !== new_member.id) {
          executor_text = `<@${nick_log.executor?.id}>`
        }
      } catch {}

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.MEMBER,
            components: [
              component.section({
                content   : "### Nickname Changed",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${new_member.id}>`,
                `- Changed by: ${executor_text}`,
                `- Before: ${old_member.nickname || "(none)"}`,
                `- After: ${new_member.nickname || "(none)"}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_member.communicationDisabledUntil !== new_member.communicationDisabledUntil) {
      const avatar_url = new_member.user.displayAvatarURL({ size: 512 })

      let executor_text = "Unknown"
      let reason_text   = "No reason provided"
      try {
        const audit_logs = await new_member.guild.fetchAuditLogs({
          type   : AuditLogEvent.MemberUpdate,
          limit  : 1,
        })
        const timeout_log = audit_logs.entries.first()
        if (timeout_log && timeout_log.target?.id === new_member.id) {
          executor_text = `<@${timeout_log.executor?.id}>`
          if (timeout_log.reason) reason_text = timeout_log.reason
        }
      } catch {}

      const is_timeout = new_member.communicationDisabledUntil && new_member.communicationDisabledUntil > new Date()

      if (is_timeout) {
        const until = Math.floor(new_member.communicationDisabledUntil.getTime() / 1000)

        const log_message = component.build_message({
          components: [
            component.container({
              accent_color: COLOR.MODERATION,
              components: [
                component.section({
                  content   : "### Member Timed Out",
                  thumbnail : avatar_url,
                }),
                component.divider(),
                component.text([
                  `- Member: <@${new_member.id}>`,
                  `- Timed out by: ${executor_text}`,
                  `- Until: <t:${until}:F>`,
                  `- Reason: ${reason_text}`,
                ]),
              ],
            }),
          ],
        })

        await send_log(client, log_message)
      } else {
        const log_message = component.build_message({
          components: [
            component.container({
              accent_color: COLOR.MODERATION,
              components: [
                component.section({
                  content   : "### Member Timeout Removed",
                  thumbnail : avatar_url,
                }),
                component.divider(),
                component.text([
                  `- Member: <@${new_member.id}>`,
                  `- Removed by: ${executor_text}`,
                ]),
              ],
            }),
          ],
        })

        await send_log(client, log_message)
      }
    }
  })

  client.on("guildBanAdd", async (ban) => {
    const avatar_url = ban.user.displayAvatarURL({ size: 512 })

    let executor_text = "Unknown"
    try {
      const audit_logs = await ban.guild.fetchAuditLogs({
        type   : AuditLogEvent.MemberBanAdd,
        limit  : 1,
      })
      const ban_log = audit_logs.entries.first()
      if (ban_log && ban_log.target?.id === ban.user.id) {
        executor_text = `<@${ban_log.executor?.id}>`
      }
    } catch {}

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MODERATION,
          components: [
            component.section({
              content   : "### Member Banned",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${ban.user.id}>`,
              `- Banned by: ${executor_text}`,
              `- Reason: ${ban.reason || "No reason provided"}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildBanRemove", async (ban) => {
    const avatar_url = ban.user.displayAvatarURL({ size: 512 })

    let executor_text = "Unknown"
    try {
      const audit_logs = await ban.guild.fetchAuditLogs({
        type   : AuditLogEvent.MemberBanRemove,
        limit  : 1,
      })
      const unban_log = audit_logs.entries.first()
      if (unban_log && unban_log.target?.id === ban.user.id) {
        executor_text = `<@${unban_log.executor?.id}>`
      }
    } catch {}

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MODERATION,
          components: [
            component.section({
              content   : "### Member Unbanned",
              thumbnail : avatar_url,
            }),
            component.divider(),
            component.text([
              `- Member: <@${ban.user.id}>`,
              `- Unbanned by: ${executor_text}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("channelCreate", async (channel) => {
    if (!("guild" in channel)) return

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.CHANNEL,
          components: [
            component.text("### Channel Created"),
            component.divider(),
            component.text([
              `- Channel: <#${channel.id}>`,
              `- Type: ${channel.type}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("channelDelete", async (channel) => {
    if (!("guild" in channel)) return

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.CHANNEL,
          components: [
            component.text("### Channel Deleted"),
            component.divider(),
            component.text([
              `- Channel: ${channel.name}`,
              `- Type: ${channel.type}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("channelUpdate", async (old_channel, new_channel) => {
    if (!("guild" in old_channel) || !("name" in old_channel) || !("name" in new_channel)) return

    if (old_channel.name !== new_channel.name) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.CHANNEL,
            components: [
              component.text("### Channel Renamed"),
              component.divider(),
              component.text([
                `- Channel: <#${new_channel.id}>`,
                `- Before: ${old_channel.name}`,
                `- After: ${new_channel.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  client.on("roleCreate", async (role) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.ROLE,
          components: [
            component.text("### Role Created"),
            component.divider(),
            component.text([
              `- Role: <@&${role.id}>`,
              `- Name: ${role.name}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("roleDelete", async (role) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.ROLE,
          components: [
            component.text("### Role Deleted"),
            component.divider(),
            component.text([
              `- Name: ${role.name}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("roleUpdate", async (old_role, new_role) => {
    if (old_role.name !== new_role.name) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.ROLE,
            components: [
              component.text("### Role Renamed"),
              component.divider(),
              component.text([
                `- Role: <@&${new_role.id}>`,
                `- Before: ${old_role.name}`,
                `- After: ${new_role.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  client.on("messageDeleteBulk", async (messages) => {
    const first = messages.first()
    if (!first || !first.guild) return

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.MESSAGE,
          components: [
            component.text("### Bulk Message Delete"),
            component.divider(),
            component.text([
              `- Channel: <#${first.channel.id}>`,
              `- Count: ${messages.size} messages`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("voiceStateUpdate", async (old_state, new_state) => {
    if (!old_state.guild) return

    if (!old_state.channel && new_state.channel) {
      const avatar_url = new_state.member?.user.displayAvatarURL({ size: 512 }) || ""

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.VOICE,
            components: [
              component.section({
                content   : "### Voice Channel Joined",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${new_state.member?.id}>`,
                `- Channel: ${new_state.channel.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    } else if (old_state.channel && !new_state.channel) {
      const avatar_url = old_state.member?.user.displayAvatarURL({ size: 512 }) || ""

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.VOICE,
            components: [
              component.section({
                content   : "### Voice Channel Left",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${old_state.member?.id}>`,
                `- Channel: ${old_state.channel.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    } else if (old_state.channel && new_state.channel && old_state.channel.id !== new_state.channel.id) {
      const avatar_url = new_state.member?.user.displayAvatarURL({ size: 512 }) || ""

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.VOICE,
            components: [
              component.section({
                content   : "### Voice Channel Switched",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${new_state.member?.id}>`,
                `- From: ${old_state.channel.name}`,
                `- To: ${new_state.channel.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_state.serverMute !== new_state.serverMute) {
      const avatar_url = new_state.member?.user.displayAvatarURL({ size: 512 }) || ""

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.VOICE,
            components: [
              component.section({
                content   : "### Server Mute Updated",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${new_state.member?.id}>`,
                `- Status: ${new_state.serverMute ? "Muted" : "Unmuted"}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_state.serverDeaf !== new_state.serverDeaf) {
      const avatar_url = new_state.member?.user.displayAvatarURL({ size: 512 }) || ""

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.VOICE,
            components: [
              component.section({
                content   : "### Server Deafen Updated",
                thumbnail : avatar_url,
              }),
              component.divider(),
              component.text([
                `- Member: <@${new_state.member?.id}>`,
                `- Status: ${new_state.serverDeaf ? "Deafened" : "Undeafened"}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  client.on("emojiCreate", async (emoji) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.EMOJI,
          components: [
            component.text("### Emoji Created"),
            component.divider(),
            component.text([
              `- Name: ${emoji.name}`,
              `- ID: ${emoji.id}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("emojiDelete", async (emoji) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.EMOJI,
          components: [
            component.text("### Emoji Deleted"),
            component.divider(),
            component.text([
              `- Name: ${emoji.name}`,
              `- ID: ${emoji.id}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("emojiUpdate", async (old_emoji, new_emoji) => {
    if (old_emoji.name !== new_emoji.name) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.EMOJI,
            components: [
              component.text("### Emoji Renamed"),
              component.divider(),
              component.text([
                `- Before: ${old_emoji.name}`,
                `- After: ${new_emoji.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  client.on("stickerCreate", async (sticker) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.STICKER,
          components: [
            component.text("### Sticker Created"),
            component.divider(),
            component.text([
              `- Name: ${sticker.name}`,
              `- ID: ${sticker.id}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("stickerDelete", async (sticker) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.STICKER,
          components: [
            component.text("### Sticker Deleted"),
            component.divider(),
            component.text([
              `- Name: ${sticker.name}`,
              `- ID: ${sticker.id}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("stickerUpdate", async (old_sticker, new_sticker) => {
    if (old_sticker.name !== new_sticker.name) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.STICKER,
            components: [
              component.text("### Sticker Renamed"),
              component.divider(),
              component.text([
                `- Before: ${old_sticker.name}`,
                `- After: ${new_sticker.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  client.on("inviteCreate", async (invite) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.INVITE,
          components: [
            component.text("### Invite Created"),
            component.divider(),
            component.text([
              `- Code: ${invite.code}`,
              `- Inviter: <@${invite.inviter?.id}>`,
              `- Channel: <#${invite.channel?.id}>`,
              `- Max Uses: ${invite.maxUses || "Unlimited"}`,
              `- Expires: ${invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:F>` : "Never"}`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("inviteDelete", async (invite) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.INVITE,
          components: [
            component.text("### Invite Deleted"),
            component.divider(),
            component.text([
              `- Code: ${invite.code}`,
              `- Channel: <#${invite.channel?.id}>`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("threadCreate", async (thread) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.THREAD,
          components: [
            component.text("### Thread Created"),
            component.divider(),
            component.text([
              `- Thread: <#${thread.id}>`,
              `- Name: ${thread.name}`,
              `- Parent: <#${thread.parentId}>`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("threadDelete", async (thread) => {
    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.THREAD,
          components: [
            component.text("### Thread Deleted"),
            component.divider(),
            component.text([
              `- Name: ${thread.name}`,
              `- Parent: <#${thread.parentId}>`,
            ]),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("threadUpdate", async (old_thread, new_thread) => {
    if (old_thread.name !== new_thread.name) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.THREAD,
            components: [
              component.text("### Thread Renamed"),
              component.divider(),
              component.text([
                `- Thread: <#${new_thread.id}>`,
                `- Before: ${old_thread.name}`,
                `- After: ${new_thread.name}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_thread.archived !== new_thread.archived) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.THREAD,
            components: [
              component.text("### Thread Archive Status"),
              component.divider(),
              component.text([
                `- Thread: <#${new_thread.id}>`,
                `- Status: ${new_thread.archived ? "Archived" : "Unarchived"}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_thread.locked !== new_thread.locked) {
      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.THREAD,
            components: [
              component.text("### Thread Lock Status"),
              component.divider(),
              component.text([
                `- Thread: <#${new_thread.id}>`,
                `- Status: ${new_thread.locked ? "Locked" : "Unlocked"}`,
              ]),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  log.info("Audit logs registered")
}
