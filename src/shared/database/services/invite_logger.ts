/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

import { Client, Guild, Invite } from "discord.js"
import { component, db }         from "../../utils"
import { load_config }           from "../../config/loader"
import { log_error }             from "../../utils/error_logger"
import { member_has_role }       from "../../utils/discord_api"
import * as cc_salary_manager    from "../managers/cc_salary.manager"

const __cc_role_id = "1284060046048886845"

interface invite_logger_config {
  invite_log_channel_id: string
}

const config = load_config<invite_logger_config>("invite_logger")

const __invite_leaderboard_collection = "invite_leaderboard"

interface invite_snapshot {
  code        : string
  uses        : number
  inviter_id? : string
  inviter_tag?: string
  channel_id? : string
  source?     : string
}

const invite_cache: Map<string, Map<string, invite_snapshot>> = new Map()

/**
 * - 获取邀请列表 - \\
 * - fetch invites - \\
 * @param {Guild} guild - guild
 * @returns {Promise<Map<string, invite_snapshot>>} invite map
 */
async function fetch_invites(guild: Guild): Promise<Map<string, invite_snapshot>> {
  const invites = await guild.invites.fetch()
  const map = new Map<string, invite_snapshot>()

  for (const invite of invites.values()) {
    map.set(invite.code, {
      code        : invite.code,
      uses        : invite.uses || 0,
      inviter_id  : invite.inviter?.id,
      inviter_tag : invite.inviter?.tag,
      channel_id  : invite.channel?.id,
      source      : "invite",
    })
  }

  return map
}

/**
 * - 更新邀请缓存 - \\
 * - update invite cache - \\
 * @param {Guild} guild - guild
 * @returns {Promise<Map<string, invite_snapshot>>} invite map
 */
async function update_invite_cache(guild: Guild): Promise<Map<string, invite_snapshot>> {
  const map = await fetch_invites(guild)
  invite_cache.set(guild.id, map)
  return map
}

/**
 * - 获取已使用邀请 - \\
 * - get used invite - \\
 * @param {Map<string, invite_snapshot> | undefined} previous - previous map
 * @param {Map<string, invite_snapshot>} current - current map
 * @param {invite_snapshot[]} invites - invite list
 * @returns {invite_snapshot | null} used invite
 */
function get_used_invite(
  previous: Map<string, invite_snapshot> | undefined,
  current: Map<string, invite_snapshot>,
  invites: invite_snapshot[]
): invite_snapshot | null {
  if (!previous) return null

  let used_invite: invite_snapshot | null = null
  let diff_max = 0

  for (const invite of invites) {
    const before = previous.get(invite.code)?.uses || 0
    const after = current.get(invite.code)?.uses || 0
    const diff = after - before
    if (diff > diff_max) {
      diff_max = diff
      used_invite = invite
    }
  }

  return used_invite
}

/**
 * - 发送邀请日志 - \\
 * - send invite log - \\
 * @param {Client} client - discord client
 * @param {object} options - log options
 * @param {string} options.member_id - member ID
 * @param {string} options.member_tag - member tag
 * @param {invite_snapshot | null} options.invite - invite
 * @returns {Promise<void>} void
 */
async function send_invite_log(
  client: Client,
  options: {
    member_id: string
    member_tag: string
    invite: invite_snapshot | null
  }
): Promise<void> {
  try {
    const channel_id = config.invite_log_channel_id
    if (!channel_id) return

    const channel = await client.channels.fetch(channel_id).catch(() => null)
    if (!channel || !channel.isTextBased() || !("send" in channel)) {
      await log_error(client, new Error("Invite log channel unavailable"), "invite_logger_send", {
        channel_id : channel_id,
        member_id  : options.member_id,
      })
      return
    }

    const invite = options.invite
    const inviter_text = invite?.inviter_id
      ? `<@${invite.inviter_id}>`
      : (invite?.source === "vanity" ? "Vanity URL" : "Unknown")
    const channel_text = invite?.channel_id
      ? `<#${invite.channel_id}>`
      : (invite?.source === "vanity" ? "N/A" : "Unknown")
    const lines = [
      "### Invite Used",
      `- Member: <@${options.member_id}> (${options.member_tag})`,
      `- Code: ${invite?.code || "Unknown"}`,
      `- Inviter: ${inviter_text}`,
      `- Channel: ${channel_text}`,
      `- Uses: ${typeof invite?.uses === "number" ? invite.uses : "Unknown"}`,
    ]

    const message = component.build_message({
      components : [
        component.container({
          components : [
            component.text(lines),
          ],
        }),
      ],
    })

    await (channel as any).send(message)
  } catch (error) {
    await log_error(client, error as Error, "invite_logger_send", {
      channel_id : config.invite_log_channel_id,
      member_id  : options.member_id,
      member_tag : options.member_tag,
      invite     : options.invite,
    })
  }
}

/**
 * - 增加邀请排行榜 - \\
 * - increment invite leaderboard - \\
 * @param {Client} client - discord client
 * @param {Guild} guild - guild
 * @param {invite_snapshot | null} invite - invite
 * @returns {Promise<void>} void
 */
async function increment_invite_leaderboard(client: Client, guild: Guild, invite: invite_snapshot | null): Promise<void> {
  if (!invite?.inviter_id) return

  try {
    const inviter_id  = invite.inviter_id
    const inviter_tag = invite.inviter_tag || "Unknown"

    const existing = await db.find_one<{ guild_id: string; inviter_id: string; inviter_tag: string; total_invite: number }>(
      __invite_leaderboard_collection,
      { guild_id: guild.id, inviter_id: inviter_id }
    )

    const next_total = (existing?.total_invite || 0) + 1
    await db.update_one(
      __invite_leaderboard_collection,
      { guild_id: guild.id, inviter_id: inviter_id },
      { guild_id: guild.id, inviter_id: inviter_id, inviter_tag: inviter_tag, total_invite: next_total },
      true
    )
  } catch (error) {
    await log_error(client, error as Error, "invite_logger_leaderboard", {
      guild_id   : guild.id,
      inviter_id : invite?.inviter_id,
      invite_code: invite?.code,
    })
  }
}

/**
 * - 启动邀请日志器 - \\
 * - start invite logger - \\
 * @param {Client} client - discord client
 * @returns {Promise<void>} void
 */
export async function start_invite_logger(client: Client): Promise<void> {
  try {
    for (const guild of client.guilds.cache.values()) {
      await update_invite_cache(guild)
    }
  } catch (error) {
    await log_error(client, error as Error, "invite_logger_init", {})
  }

  client.on("inviteCreate", async (invite) => {
    try {
      const guild_id = invite.guild?.id
      if (!guild_id) return
      const guild = await client.guilds.fetch(guild_id).catch(() => null)
      if (!guild) return
      await update_invite_cache(guild)
    } catch (error) {
      await log_error(client, error as Error, "invite_logger_create", {
        invite_code : invite.code,
        guild_id    : invite.guild?.id,
      })
    }
  })

  client.on("inviteDelete", async (invite) => {
    try {
      const guild_id = invite.guild?.id
      if (!guild_id) return
      const guild = await client.guilds.fetch(guild_id).catch(() => null)
      if (!guild) return
      await update_invite_cache(guild)
    } catch (error) {
      await log_error(client, error as Error, "invite_logger_delete", {
        invite_code : invite.code,
        guild_id    : invite.guild?.id,
      })
    }
  })

  client.on("guildMemberAdd", async (member) => {
    try {
      const guild = member.guild
      const previous = invite_cache.get(guild.id)
      const invites_collection = await guild.invites.fetch()
      const current = new Map<string, invite_snapshot>()
      const invites: invite_snapshot[] = []

      for (const invite of invites_collection.values()) {
        const snapshot: invite_snapshot = {
          code        : invite.code,
          uses        : invite.uses || 0,
          inviter_id  : invite.inviter?.id,
          inviter_tag : invite.inviter?.tag,
          channel_id  : invite.channel?.id,
          source      : "invite",
        }
        current.set(invite.code, snapshot)
        invites.push(snapshot)
      }

      let used_invite = get_used_invite(previous, current, invites)
      invite_cache.set(guild.id, current)

      if (!used_invite && guild.vanityURLCode) {
        const vanity = await guild.fetchVanityData().catch(() => null)
        used_invite = {
          code   : vanity?.code || guild.vanityURLCode,
          uses   : vanity?.uses || 0,
          source : "vanity",
        }
      }

      await send_invite_log(client, {
        member_id  : member.id,
        member_tag : member.user.tag,
        invite     : used_invite,
      })

      await increment_invite_leaderboard(client, guild, used_invite)

      // - 如果邀请者是 content creator，记录 CC 邀请 - \\
      // - if inviter is a content creator, record cc invite - \\
      if (used_invite?.inviter_id) {
        try {
          const inviter_member = await guild.members.fetch(used_invite.inviter_id).catch(() => null)
          if (inviter_member && member_has_role(inviter_member, __cc_role_id)) {
            await cc_salary_manager.record_invite(
              used_invite.inviter_id,
              member.id,
              guild.id,
              used_invite.code,
            )
          }
        } catch (cc_err) {
          await log_error(client, cc_err as Error, "CC Invite Tracking", {
            inviter_id : used_invite.inviter_id,
            member_id  : member.id,
            guild_id   : guild.id,
          }).catch(() => {})
        }
      }
    } catch (error) {
      await log_error(client, error as Error, "invite_logger_member_add", {
        guild_id  : member.guild?.id,
        member_id : member.id,
      })
    }
  })
}
