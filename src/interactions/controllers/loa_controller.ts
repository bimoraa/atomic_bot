import { Client } from "discord.js"
import { component, time, db, api } from "../../utils"
import { log_error }                from "../../utils/error_logger"

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN

const loa_manager_roles = [
  "1316021423206039596",
  "1316022809868107827",
  "1346622175985143908",
  "1273229155151904852",
]

interface loa_data {
  _id?              : any
  message_id        : string
  user_id           : string
  user_tag          : string
  start_date        : number
  end_date          : number
  type              : string
  reason            : string
  status            : "pending" | "approved" | "rejected" | "ended"
  approved_by?      : string
  rejected_by?      : string
  original_nickname?: string
  created_at        : number
  guild_id?         : string
  channel_id?       : string
}

interface request_loa_options {
  user_id   : string
  user_tag  : string
  client    : Client
  end_date  : string
  type      : string
  reason    : string
  guild_id? : string
  channel_id?: string
}

interface approve_loa_options {
  message_id: string
  approver_id: string
  client    : Client
  guild_id  : string
}

interface reject_loa_options {
  message_id: string
  rejector_id: string
  client    : Client
}

interface end_loa_options {
  message_id: string
  ender_id  : string
  client    : Client
  guild_id  : string
}

export function get_loa_panel() {
  const now = Math.floor(Date.now() / 1000)

  return component.build_message({
    components: [
      component.container({
        accent_color: null,
        components  : [
          component.text("## Leave of Absence"),
        ],
      }),
      component.container({
        components: [
          component.text([
            `- Start Date: ${time.full_date_time(now)}`,
            `- End Date: Not set`,
          ]),
          component.divider(2),
          component.text([
            "- Type of Leave: Not set",
            "- Reason: Not set",
          ]),
        ],
      }),
      component.container({
        components: [
          component.action_row(
            component.secondary_button("Request LOA", "loa_request"),
            component.success_button("Approve", "loa_approve"),
            component.danger_button("Reject", "loa_reject")
          ),
        ],
      }),
    ],
  })
}

export async function request_loa(options: request_loa_options) {
  const { user_id, user_tag, client, end_date, type, reason, guild_id, channel_id } = options

  const date_match = end_date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!date_match) {
    return {
      success: false,
      error  : "Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-12-31)",
    }
  }

  const [, year, month, day] = date_match
  const end_date_obj         = new Date(`${year}-${month}-${day}T00:00:00Z`)

  if (isNaN(end_date_obj.getTime())) {
    return {
      success: false,
      error  : "Invalid date. Please check your input",
    }
  }

  const now           = Math.floor(Date.now() / 1000)
  const end_timestamp = Math.floor(end_date_obj.getTime() / 1000)

  if (end_timestamp <= now) {
    return {
      success: false,
      error  : "End date must be in the future",
    }
  }

  try {
    const loa_message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("FEE75C"),
          components  : [
            component.text("## Leave of Absence - Pending"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `- Requester: <@${user_id}>`,
              `- Start Date: ${time.full_date_time(now)}`,
              `- End Date: ${time.full_date_time(end_timestamp)}`,
            ]),
            component.divider(2),
            component.text([
              `- Type of Leave: ${type}`,
              `- Reason: ${reason}`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Request LOA", "loa_request"),
              component.success_button("Approve", "loa_approve"),
              component.danger_button("Reject", "loa_reject")
            ),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: loa_message,
      data   : {
        user_id,
        user_tag,
        start_date : now,
        end_date   : end_timestamp,
        type,
        reason,
        status     : "pending" as const,
        created_at : now,
        guild_id,
        channel_id,
      },
    }
  } catch (err) {
    await log_error(client, err as Error, "Request LOA Controller", {
      user_id,
      user_tag,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to create LOA request",
    }
  }
}

export async function approve_loa(options: approve_loa_options) {
  const { message_id, approver_id, client, guild_id } = options

  try {
    console.log(`[ - LOA APPROVE - ] Looking for LOA with message_id: ${message_id}`)

    const loa = await db.find_one<loa_data>("loa_requests", { message_id })

    console.log(`[ - LOA APPROVE - ] Found LOA:`, loa)

    if (!loa) {
      console.error(`[ - LOA APPROVE - ] LOA request not found for message_id: ${message_id}`)
      return {
        success: false,
        error  : "LOA request not found",
      }
    }

    if (loa.status !== "pending") {
      return {
        success: false,
        error  : `This request has already been ${loa.status}`,
      }
    }

    let original_nickname: string | null = null

    try {
      const guild  = client.guilds.cache.get(guild_id)
      if (!guild) throw new Error("Guild not found")

      const member = await guild.members.fetch(loa.user_id)
      original_nickname = member.nickname || member.user.displayName || member.user.username

      console.log(`[LOA] Processing approval for ${loa.user_tag}`)
      console.log(`[LOA] Original nickname: ${original_nickname}`)

      await member.roles.add("1274580813912211477")
      console.log(`[LOA] Role added`)

      await member.setNickname(`[LOA] - ${original_nickname}`)
      console.log(`[LOA] Nickname set to: [LOA] - ${original_nickname}`)
    } catch (role_err) {
      console.error("[LOA] Failed to set role/nickname:", role_err)
      await log_error(client, role_err as Error, "LOA Role/Nickname", {
        user_id : loa.user_id,
        user_tag: loa.user_tag,
      }).catch(() => {})
    }

    await db.update_one(
      "loa_requests",
      { message_id },
      {
        status           : "approved",
        approved_by      : approver_id,
        original_nickname: original_nickname || undefined,
      }
    )

    const updated_message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("57F287"),
          components  : [
            component.text("## Leave of Absence - Approved"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `- Requester: <@${loa.user_id}>`,
              `- Start Date: ${time.full_date_time(loa.start_date)}`,
              `- End Date: ${time.full_date_time(loa.end_date)}`,
            ]),
            component.divider(2),
            component.text([
              `- Type of Leave: ${loa.type}`,
              `- Reason: ${loa.reason}`,
            ]),
            component.divider(2),
            component.text(`- Approved by: <@${approver_id}>`),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Request LOA", "loa_request"),
              component.danger_button("End LOA", "loa_end")
            ),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: updated_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Approve LOA Controller", {
      message_id,
      approver_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to approve LOA request",
    }
  }
}

export async function reject_loa(options: reject_loa_options) {
  const { message_id, rejector_id, client } = options

  try {
    console.log(`[ - LOA REJECT - ] Looking for LOA with message_id: ${message_id}`)

    const loa = await db.find_one<loa_data>("loa_requests", { message_id })

    console.log(`[ - LOA REJECT - ] Found LOA:`, loa)

    if (!loa) {
      console.error(`[ - LOA REJECT - ] LOA request not found for message_id: ${message_id}`)
      return {
        success: false,
        error  : "LOA request not found",
      }
    }

    if (loa.status !== "pending") {
      return {
        success: false,
        error  : `This request has already been ${loa.status}`,
      }
    }

    await db.update_one(
      "loa_requests",
      { message_id },
      {
        status     : "rejected",
        rejected_by: rejector_id,
      }
    )

    const updated_message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("ED4245"),
          components  : [
            component.text("## Leave of Absence - Rejected"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `- Requester: <@${loa.user_id}>`,
              `- Start Date: ${time.full_date_time(loa.start_date)}`,
              `- End Date: ${time.full_date_time(loa.end_date)}`,
            ]),
            component.divider(2),
            component.text([
              `- Type of Leave: ${loa.type}`,
              `- Reason: ${loa.reason}`,
            ]),
            component.divider(2),
            component.text(`- Rejected by: <@${rejector_id}>`),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Request LOA", "loa_request")
            ),
          ],
        }),
      ],
    })

    return {
      success: true,
      message: updated_message,
    }
  } catch (err) {
    await log_error(client, err as Error, "Reject LOA Controller", {
      message_id,
      rejector_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to reject LOA request",
    }
  }
}

export async function end_loa(options: end_loa_options) {
  const { message_id, ender_id, client, guild_id } = options

  try {
    console.log(`[ - LOA END - ] Looking for LOA with message_id: ${message_id}`)

    const loa = await db.find_one<loa_data>("loa_requests", { message_id })

    console.log(`[ - LOA END - ] Found LOA:`, loa)

    if (!loa) {
      console.error(`[ - LOA END - ] LOA request not found for message_id: ${message_id}`)
      return {
        success: false,
        error  : "LOA request not found",
      }
    }

    if (loa.status !== "approved") {
      return {
        success: false,
        error  : `This LOA is ${loa.status}, cannot end`,
      }
    }

    const guild = client.guilds.cache.get(guild_id)
    if (guild) {
      const member = await guild.members.fetch(loa.user_id).catch(() => null)
      if (member) {
        await member.roles.remove("1274580813912211477").catch(() => {})

        if (loa.original_nickname) {
          await member.setNickname(loa.original_nickname).catch(() => {})
        }
      }
    }

    if (discord_token) {
      const dm_message = component.build_message({
        components: [
          component.container({
            accent_color: component.from_hex("57F287"),
            components  : [
              component.text("## Leave of Absence Ended"),
            ],
          }),
          component.container({
            components: [
              component.text([
                "Your leave of absence has been ended by staff.",
                `- Type: ${loa.type}`,
                `- Duration: ${time.full_date_time(loa.start_date)} to ${time.full_date_time(loa.end_date)}`,
              ]),
              component.divider(2),
              component.text(`- Ended by: <@${ender_id}>`),
              component.divider(2),
              component.text("Your role and nickname have been restored."),
            ],
          }),
        ],
      })

      await api.send_dm(loa.user_id, discord_token, dm_message).catch(() => {})
    }

    await db.update_one("loa_requests", { message_id }, { status: "ended" })

    if (discord_token && loa.channel_id) {
      await api.delete_message(loa.channel_id, message_id, discord_token).catch(async (err) => {
        await log_error(client, err as Error, "Delete LOA Message", {
          message_id,
          channel_id: loa.channel_id,
        }).catch(() => {})
      })
    }

    return {
      success       : true,
      message_deleted: true,
    }
  } catch (err) {
    await log_error(client, err as Error, "End LOA Controller", {
      message_id,
      ender_id,
    }).catch(() => {})

    return {
      success: false,
      error  : "Failed to end LOA request",
    }
  }
}

export function has_loa_permission(member_roles: any): boolean {
  return loa_manager_roles.some(role_id =>
    member_roles.cache?.has(role_id) || member_roles.includes?.(role_id)
  )
}
