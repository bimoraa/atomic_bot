import { Client, Guild, Invite } from "discord.js"
import { api, component, db }    from "../../utils"
import { load_config }           from "../../config/loader"
import { log_error }             from "../../utils/error_logger"

interface invite_logger_config {
  invite_log_channel_id: string
}

const config = load_config<invite_logger_config>("invite_logger")

const INVITE_LEADERBOARD_COLLECTION = "invite_leaderboard"

const invite_cache: Map<string, Map<string, number>> = new Map()

/**
 * - FETCH INVITES - \\
 * @param {Guild} guild - Guild
 * @returns {Promise<Map<string, number>>} Invite uses map
 */
async function fetch_invites(guild: Guild): Promise<Map<string, number>> {
  const invites = await guild.invites.fetch()
  const map = new Map<string, number>()

  for (const invite of invites.values()) {
    map.set(invite.code, invite.uses || 0)
  }

  return map
}

/**
 * - UPDATE INVITE CACHE - \\
 * @param {Guild} guild - Guild
 * @returns {Promise<Map<string, number>>} Invite uses map
 */
async function update_invite_cache(guild: Guild): Promise<Map<string, number>> {
  const map = await fetch_invites(guild)
  invite_cache.set(guild.id, map)
  return map
}

/**
 * - GET USED INVITE - \\
 * @param {Map<string, number> | undefined} previous - Previous map
 * @param {Map<string, number>} current - Current map
 * @param {Invite[]} invites - Invite list
 * @returns {Invite | null} Used invite
 */
function get_used_invite(
  previous: Map<string, number> | undefined,
  current: Map<string, number>,
  invites: Invite[]
): Invite | null {
  if (!previous) return null

  let used_invite: Invite | null = null
  let diff_max = 0

  for (const invite of invites) {
    const before = previous.get(invite.code) || 0
    const after = current.get(invite.code) || 0
    const diff = after - before
    if (diff > diff_max) {
      diff_max = diff
      used_invite = invite
    }
  }

  return used_invite
}

/**
 * - SEND INVITE LOG - \\
 * @param {Client} client - Discord client
 * @param {object} options - Log options
 * @param {string} options.member_id - Member ID
 * @param {string} options.member_tag - Member tag
 * @param {Invite | null} options.invite - Invite
 * @returns {Promise<void>} Void
 */
async function send_invite_log(
  client: Client,
  options: {
    member_id: string
    member_tag: string
    invite: Invite | null
  }
): Promise<void> {
  const channel_id = config.invite_log_channel_id
  if (!channel_id) return

  const invite = options.invite
  const lines = [
    "### Invite Used",
    `- Member: <@${options.member_id}> (${options.member_tag})`,
    `- Code: ${invite?.code || "Unknown"}`,
    `- Inviter: ${invite?.inviter?.id ? `<@${invite.inviter.id}>` : "Unknown"}`,
    `- Channel: ${invite?.channel?.id ? `<#${invite.channel.id}>` : "Unknown"}`,
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

  const result = await api.send_components_v2(channel_id, api.get_token(), message)
  if (result.error) {
    await log_error(client, new Error("Invite log failed"), "invite_logger_send", {
      channel_id : channel_id,
      response   : result,
    })
  }
}

/**
 * - INCREMENT INVITE LEADERBOARD - \\
 * @param {Client} client - Discord client
 * @param {Guild} guild - Guild
 * @param {Invite | null} invite - Invite
 * @returns {Promise<void>} Void
 */
async function increment_invite_leaderboard(client: Client, guild: Guild, invite: Invite | null): Promise<void> {
  if (!invite?.inviter?.id) return

  try {
    const inviter_id  = invite.inviter.id
    const inviter_tag = invite.inviter.tag || "Unknown"

    const existing = await db.find_one<{ guild_id: string; inviter_id: string; inviter_tag: string; total_invite: number }>(
      INVITE_LEADERBOARD_COLLECTION,
      { guild_id: guild.id, inviter_id: inviter_id }
    )

    const next_total = (existing?.total_invite || 0) + 1
    await db.update_one(
      INVITE_LEADERBOARD_COLLECTION,
      { guild_id: guild.id, inviter_id: inviter_id },
      { guild_id: guild.id, inviter_id: inviter_id, inviter_tag: inviter_tag, total_invite: next_total },
      true
    )
  } catch (error) {
    await log_error(client, error as Error, "invite_logger_leaderboard", {
      guild_id   : guild.id,
      inviter_id : invite?.inviter?.id,
      invite_code: invite?.code,
    })
  }
}

/**
 * - START INVITE LOGGER - \\
 * @param {Client} client - Discord client
 * @returns {Promise<void>} Void
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
      const current = new Map<string, number>()
      const invites: Invite[] = []

      for (const invite of invites_collection.values()) {
        current.set(invite.code, invite.uses || 0)
        invites.push(invite)
      }

      const used_invite = get_used_invite(previous, current, invites)
      invite_cache.set(guild.id, current)

      await send_invite_log(client, {
        member_id  : member.id,
        member_tag : member.user.tag,
        invite     : used_invite,
      })

      await increment_invite_leaderboard(client, guild, used_invite)
    } catch (error) {
      await log_error(client, error as Error, "invite_logger_member_add", {
        guild_id  : member.guild?.id,
        member_id : member.id,
      })
    }
  })
}
