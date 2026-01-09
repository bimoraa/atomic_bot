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
  User,
}                                       from "discord.js"
import { logger, component, format }    from "../utils"
import { track_deleted_message }        from "../../infrastructure/cache/snipe"

const log            = logger.create_logger("audit_log")
const LOG_CHANNEL_ID = "1452086939866894420"
const OWNER_ID       = "1118453649727823974"

const avatar_cache = new Map<string, string>()

const COLOR = {
  CREATE : 0x57F287,
  UPDATE : 0xFEE75C,
  DELETE : 0xED4245,
  JOIN   : 0x57F287,
  LEAVE  : 0xED4245,
  BAN    : 0xED4245,
  UNBAN  : 0x57F287,
  TIMEOUT: 0xFEE75C,
  INFO   : 0x5865F2,
}

async function get_avatar_url(user: User): Promise<string> {
  const user_id = user.id
  
  if (avatar_cache.has(user_id)) {
    return avatar_cache.get(user_id)!
  }

  try {
    const avatar_url = user.displayAvatarURL({ extension: "png", size: 512 })
    avatar_cache.set(user_id, avatar_url)
    return avatar_url
  } catch {
    avatar_cache.set(user_id, format.default_avatar)
    return format.default_avatar
  }
}

async function send_log(client: Client, log_message: any): Promise<void> {
  try {
    const log_channel = await client.channels.fetch(LOG_CHANNEL_ID) as TextChannel
    if (!log_channel || !log_channel.isTextBased()) return

    await log_channel.send({
      ...log_message,
      allowedMentions: {
        parse: [],
        users: [],
        roles: [],
      },
    })
  } catch (error) {
    log.error("Failed to send audit log:", error)
  }
}

export function register_audit_logs(client: Client): void {
  client.on("messageUpdate", async (old_message, new_message) => {
    if (!old_message.guild || old_message.author?.bot) return
    
    const content_changed     = old_message.content !== new_message.content
    const attachments_changed = old_message.attachments.size !== new_message.attachments.size

    if (!content_changed && !attachments_changed) return

    const avatar_url = old_message.author ? await get_avatar_url(old_message.author) : format.default_avatar

    const content_parts = [
      "### Message Edited",
      `- Author: <@${old_message.author?.id}>`,
      `- Channel: <#${old_message.channel.id}>`,
    ]

    if (content_changed) {
      content_parts.push(`- Before: ${old_message.content || "(empty)"}`)
      content_parts.push(`- After: ${new_message.content || "(empty)"}`)
    }

    if (attachments_changed) {
      const old_attachments = old_message.attachments.map(a => `[${a.name}](${a.url})`).join(", ") || "None"
      const new_attachments = new_message.attachments.map(a => `[${a.name}](${a.url})`).join(", ") || "None"
      content_parts.push(`- Attachments Before: ${old_attachments}`)
      content_parts.push(`- Attachments After: ${new_attachments}`)
    }

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.UPDATE,
          components: [
            component.section({
              content: content_parts.join("\n"),
              thumbnail: avatar_url,
            }),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("messageDelete", async (message) => {
    if (!message.guild) return

    const is_log_channel = message.channel.id === LOG_CHANNEL_ID

    if (is_log_channel) {
      let executor_id  = "Unknown"
      let executor_tag = "Unknown"

      try {
        const audit_logs = await message.guild.fetchAuditLogs({
          type : AuditLogEvent.MessageDelete,
          limit: 5,
        })

        const entry = audit_logs.entries.find((audit) => {
          const audit_channel = (audit.extra as any)?.channel?.id
          const recent        = Date.now() - audit.createdTimestamp < 10000
          return audit_channel === LOG_CHANNEL_ID && recent
        })

        if (entry?.executor) {
          executor_id  = entry.executor.id
          executor_tag = entry.executor.tag || "Unknown"
        }
      } catch {}

      try {
        const owner_user    = await client.users.fetch(OWNER_ID)
        const content_text  = message.content?.trim() || "(empty)"
        const created_ts    = message.createdTimestamp ? Math.floor(message.createdTimestamp / 1000) : Math.floor(Date.now() / 1000)
        const deleted_ts    = Math.floor(Date.now() / 1000)
        const author_text   = message.author ? `<@${message.author.id}> (${message.author.tag})` : "Unknown"
        const executor_text = executor_id === "Unknown" ? "Unknown" : `<@${executor_id}> (${executor_tag})`

        const executor_avatar = executor_id === "Unknown" 
          ? "https://cdn.discordapp.com/embed/avatars/0.png"
          : `https://cdn.discordapp.com/avatars/${executor_id}/${(await client.users.fetch(executor_id).catch(() => null))?.avatar || "0"}.png`

        const warning_message = component.build_message({
          components: [
            component.container({
              accent_color: COLOR.DELETE,
              components: [
                component.section({
                  content: [
                    "## Audit Log Message Deleted",
                    `- Channel: <#${LOG_CHANNEL_ID}>`,
                    `- Executor: ${executor_text}`,
                    `- Original Author: ${author_text}`,
                    `- Message ID: ${message.id}`,
                    `- Created: <t:${created_ts}:F>`,
                    `- Deleted: <t:${deleted_ts}:F>`,
                    `- Content: ${content_text}`,
                  ].join("\n"),
                  thumbnail: executor_avatar,
                }),
              ],
            }),
          ],
        })

        await owner_user.send(warning_message)
      } catch {}
    }

    if (message.author?.bot) return

    track_deleted_message(message)

    const avatar_url   = message.author ? await get_avatar_url(message.author) : format.default_avatar
    const content_text = message.content?.trim() || ""
    const has_content  = content_text.length > 0
    const has_attachments = message.attachments.size > 0
    const has_embeds      = message.embeds.length > 0
    
    const content_lines = []
    if (has_content) {
      content_lines.push(`- Content: ${content_text}`)
    }
    if (has_attachments) {
      const attachment_list = message.attachments.map(a => {
        const size = (a.size / 1024).toFixed(2)
        return `[${a.name}](${a.url}) (${size} KB)`
      }).join(", ")
      content_lines.push(`- Attachments (${message.attachments.size}): ${attachment_list}`)
    }
    if (has_embeds) {
      content_lines.push(`- Embeds: ${message.embeds.length} embed(s)`)
    }
    if (!has_content && !has_attachments && !has_embeds) {
      content_lines.push(`- Content: ${format.italic("Message had no content (possibly a component message)")}` )
    }

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.DELETE,
          components: [
            component.section({
              content: [
                "### Message Deleted",
                `- Author: <@${message.author?.id}>`,
                `- Channel: <#${message.channel.id}>`,
                ...content_lines,
              ].join("\n"),
              thumbnail: avatar_url,
            }),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildMemberAdd", async (member) => {
    const avatar_url = await get_avatar_url(member.user)

    const log_message = component.build_message({
      components: [
        component.container({
          accent_color: COLOR.JOIN,
          components: [
            component.section({
              content: [
                "### Member Joined",
                `- Member: <@${member.id}>`,
                `- Account Created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`,
              ].join("\n"),
              thumbnail: avatar_url,
            }),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildMemberRemove", async (member) => {
    const avatar_url = await get_avatar_url(member.user)

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
          accent_color: COLOR.LEAVE,
          components: [
            component.section({
              content: [
                "### Member Left",
                `- Member: <@${member.id}>`,
                `- Roles: ${member.roles.cache.filter(r => r.name !== "@everyone").map(r => r.name).join(", ") || "None"}${kick_info}`,
              ].join("\n"),
              thumbnail: avatar_url,
            }),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildMemberUpdate", async (old_member, new_member) => {
    if (old_member.partial) await old_member.fetch()
    if (new_member.partial) await new_member.fetch()
    
    const old_roles = old_member.roles.cache.map(r => r.name).sort()
    const new_roles = new_member.roles.cache.map(r => r.name).sort()

    if (JSON.stringify(old_roles) !== JSON.stringify(new_roles)) {
      const added   = new_roles.filter(r => !old_roles.includes(r))
      const removed = old_roles.filter(r => !new_roles.includes(r))

      const changes = []
      if (added.length > 0) changes.push(`Added: ${added.join(", ")}`)
      if (removed.length > 0) changes.push(`Removed: ${removed.join(", ")}`)

      const avatar_url = await get_avatar_url(new_member.user)

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
            accent_color: COLOR.UPDATE,
            components: [
              component.section({
                content: [
                  "### Member Roles Updated",
                  `- Member: <@${new_member.id}>`,
                  `- Updated by: ${executor_text}`,
                  `- Changes: ${changes.join(" | ")}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_member.nickname !== new_member.nickname) {
      const avatar_url = await get_avatar_url(new_member.user)

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
            accent_color: COLOR.UPDATE,
            components: [
              component.section({
                content: [
                  "### Nickname Changed",
                  `- Member: <@${new_member.id}>`,
                  `- Changed by: ${executor_text}`,
                  `- Before: ${old_member.nickname || "(none)"}`,
                  `- After: ${new_member.nickname || "(none)"}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
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
              accent_color: COLOR.TIMEOUT,
              components: [
                component.section({
                  content: [
                    "### Member Timed Out",
                    `- Member: <@${new_member.id}>`,
                    `- Timed out by: ${executor_text}`,
                    `- Until: <t:${until}:F>`,
                    `- Reason: ${reason_text}`,
                  ].join("\n"),
                  thumbnail: avatar_url,
                }),
              ],
            }),
          ],
        })

        await send_log(client, log_message)
      } else {
        const log_message = component.build_message({
          components: [
            component.container({
              accent_color: COLOR.UPDATE,
              components: [
                component.section({
                  content: [
                    "### Timeout Removed",
                    `- Member: <@${new_member.id}>`,
                    `- Removed by: ${executor_text}`,
                  ].join("\n"),
                  thumbnail: avatar_url,
                }),
              ],
            }),
          ],
        })

        await send_log(client, log_message)
      }
    }
  })

  client.on("guildBanAdd", async (ban) => {
    const avatar_url = await get_avatar_url(ban.user)

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
          accent_color: COLOR.BAN,
          components: [
            component.section({
              content: [
                "### Member Banned",
                `- Member: <@${ban.user.id}>`,
                `- Banned by: ${executor_text}`,
                `- Reason: ${ban.reason || "No reason provided"}`,
              ].join("\n"),
              thumbnail: avatar_url,
            }),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("guildBanRemove", async (ban) => {
    const avatar_url = await get_avatar_url(ban.user)

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
          accent_color: COLOR.UNBAN,
          components: [
            component.section({
              content: [
                "### Member Unbanned",
                `- Member: <@${ban.user.id}>`,
                `- Unbanned by: ${executor_text}`,
              ].join("\n"),
              thumbnail: avatar_url,
            }),
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
          accent_color: COLOR.CREATE,
          components: [
            component.text([
              "### Channel Created",
              `- Channel: <#${channel.id}>`,
              `- Type: ${channel.type}`,
            ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.text([
              "### Channel Deleted",
              `- Channel: ${channel.name}`,
              `- Type: ${channel.type}`,
            ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Channel Renamed",
                `- Channel: <#${new_channel.id}>`,
                `- Before: ${old_channel.name}`,
                `- After: ${new_channel.name}`,
              ].join("\n")),
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
          accent_color: COLOR.CREATE,
          components: [
            component.text([
              "### Role Created",
              `- Role: <@&${role.id}>`,
              `- Name: ${role.name}`,
            ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.text([
              "### Role Deleted",
              `- Name: ${role.name}`,
            ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Role Renamed",
                `- Role: <@&${new_role.id}>`,
                `- Before: ${old_role.name}`,
                `- After: ${new_role.name}`,
              ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.section({
              content: [
                "### Bulk Message Delete",
                `- Channel: <#${first.channel.id}>`,
                `- Count: ${messages.size} messages`,
              ].join("\n"),
            }),
          ],
        }),
      ],
    })

    await send_log(client, log_message)
  })

  client.on("voiceStateUpdate", async (old_state, new_state) => {
    if (!old_state.guild) return

    if (!old_state.channel && new_state.channel) {
      const avatar_url = new_state.member?.user ? await get_avatar_url(new_state.member.user) : format.default_avatar

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.JOIN,
            components: [
              component.section({
                content: [
                  "### Voice Channel Joined",
                  `- Member: <@${new_state.member?.id}>`,
                  `- Channel: ${new_state.channel.name}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    } else if (old_state.channel && !new_state.channel) {
      const avatar_url = old_state.member?.user ? await get_avatar_url(old_state.member.user) : format.default_avatar

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.LEAVE,
            components: [
              component.section({
                content: [
                  "### Voice Channel Left",
                  `- Member: <@${old_state.member?.id}>`,
                  `- Channel: ${old_state.channel.name}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    } else if (old_state.channel && new_state.channel && old_state.channel.id !== new_state.channel.id) {
      const avatar_url = new_state.member?.user ? await get_avatar_url(new_state.member.user) : format.default_avatar

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.UPDATE,
            components: [
              component.section({
                content: [
                  "### Voice Channel Switched",
                  `- Member: <@${new_state.member?.id}>`,
                  `- From: ${old_state.channel.name}`,
                  `- To: ${new_state.channel.name}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_state.serverMute !== new_state.serverMute) {
      const avatar_url = new_state.member?.user ? await get_avatar_url(new_state.member.user) : format.default_avatar

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.UPDATE,
            components: [
              component.section({
                content: [
                  "### Server Mute Updated",
                  `- Member: <@${new_state.member?.id}>`,
                  `- Status: ${new_state.serverMute ? "Muted" : "Unmuted"}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }

    if (old_state.serverDeaf !== new_state.serverDeaf) {
      const avatar_url = new_state.member?.user ? await get_avatar_url(new_state.member.user) : format.default_avatar

      const log_message = component.build_message({
        components: [
          component.container({
            accent_color: COLOR.UPDATE,
            components: [
              component.section({
                content: [
                  "### Server Deafen Updated",
                  `- Member: <@${new_state.member?.id}>`,
                  `- Status: ${new_state.serverDeaf ? "Deafened" : "Undeafened"}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
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
          accent_color: COLOR.CREATE,
          components: [
            component.text([
              "### Emoji Created",
              `- Name: ${emoji.name}`,
              `- ID: ${emoji.id}`,
            ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.text([
              "### Emoji Deleted",
              `- Name: ${emoji.name}`,
              `- ID: ${emoji.id}`,
            ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Emoji Renamed",
                `- Before: ${old_emoji.name}`,
                `- After: ${new_emoji.name}`,
              ].join("\n")),
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
          accent_color: COLOR.CREATE,
          components: [
            component.text([
              "### Sticker Created",
              `- Name: ${sticker.name}`,
              `- ID: ${sticker.id}`,
            ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.text([
              "### Sticker Deleted",
              `- Name: ${sticker.name}`,
              `- ID: ${sticker.id}`,
            ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Sticker Renamed",
                `- Before: ${old_sticker.name}`,
                `- After: ${new_sticker.name}`,
              ].join("\n")),
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
          accent_color: COLOR.CREATE,
          components: [
            component.text([
              "### Invite Created",
              `- Code: ${invite.code}`,
              `- Inviter: <@${invite.inviter?.id}>`,
              `- Channel: <#${invite.channel?.id}>`,
              `- Max Uses: ${invite.maxUses || "Unlimited"}`,
              `- Expires: ${invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:F>` : "Never"}`,
            ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.text([
              "### Invite Deleted",
              `- Code: ${invite.code}`,
              `- Channel: <#${invite.channel?.id}>`,
            ].join("\n")),
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
          accent_color: COLOR.CREATE,
          components: [
            component.text([
              "### Thread Created",
              `- Thread: <#${thread.id}>`,
              `- Name: ${thread.name}`,
              `- Parent: <#${thread.parentId}>`,
            ].join("\n")),
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
          accent_color: COLOR.DELETE,
          components: [
            component.text([
              "### Thread Deleted",
              `- Name: ${thread.name}`,
              `- Parent: <#${thread.parentId}>`,
            ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Thread Renamed",
                `- Thread: <#${new_thread.id}>`,
                `- Before: ${old_thread.name}`,
                `- After: ${new_thread.name}`,
              ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Thread Archive Status",
                `- Thread: <#${new_thread.id}>`,
                `- Status: ${new_thread.archived ? "Archived" : "Unarchived"}`,
              ].join("\n")),
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
            accent_color: COLOR.UPDATE,
            components: [
              component.text([
                "### Thread Lock Status",
                `- Thread: <#${new_thread.id}>`,
                `- Status: ${new_thread.locked ? "Locked" : "Unlocked"}`,
              ].join("\n")),
            ],
          }),
        ],
      })

      await send_log(client, log_message)
    }
  })

  log.info("Audit logs registered")
}
