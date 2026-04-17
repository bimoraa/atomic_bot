/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - content creator salary 控制器 - \\
// - content creator salary controller - \\

import { Client, GuildMember }                              from "discord.js"
import { component, time }                                  from "@utils"
import { log_error }                                        from "@utils/error_logger"
import * as cc_salary_manager                               from "@managers/cc_salary.manager"
import { cc_salary_data, cc_salary_log_data, cc_invite_data } from "@models/cc_salary.model"

const __cc_role_id = "1284060046048886845"

// ─── cc panel: check earnings ──────────────────────────────────

/**
 * @description build earnings overview for a content creator
 * @param {string} cc_id    - cc user id
 * @param {string} guild_id - guild id
 * @returns {Promise<any>} component v2 message payload
 */
export async function build_earnings_message(cc_id: string, guild_id: string) {
  const salary = await cc_salary_manager.get_salary(cc_id, guild_id)

  const total_earned    = salary?.total_earned ?? 0
  const total_withdrawn = salary?.total_withdrawn ?? 0
  const balance         = salary?.balance ?? 0
  const total_invites   = salary?.total_invites ?? 0
  const total_sales     = salary?.total_sales ?? 0

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("57F287"),
        components: [
          component.text("## <:money:1381580383090380951> Content Creator Earnings"),
        ],
      }),
      component.container({
        components: [
          component.text([
            `### Balance`,
            `- Current Balance: **Rp ${balance.toLocaleString("id-ID")}**`,
            `- Total Earned: **Rp ${total_earned.toLocaleString("id-ID")}**`,
            `- Total Withdrawn: **Rp ${total_withdrawn.toLocaleString("id-ID")}**`,
          ]),
          component.divider(2),
          component.text([
            `### Stats`,
            `- Total Invites: **${total_invites}**`,
            `- Total Sales: **${total_sales}**`,
            `- Earning per Sale: **Rp 2.500**`,
          ]),
        ],
      }),
    ],
  })
}

// ─── cc panel: get invite link ─────────────────────────────────

/**
 * @description build invite link creation message
 * @param {GuildMember} member - the cc member
 * @returns {Promise<any>} component v2 message payload
 */
export async function build_invite_link_message(member: GuildMember) {
  try {
    const guild   = member.guild
    const channels = await guild.channels.fetch()

    // - 找到第一个可用的文字频道 - \\
    // - find first available text channel - \\
    const text_channel = channels.find(ch => ch && ch.isTextBased() && !ch.isThread() && !ch.isVoiceBased())

    if (!text_channel) {
      return component.build_message({
        components: [
          component.container({
            components: [
              component.text("## Error\nNo available text channel found to create an invite."),
            ],
          }),
        ],
      })
    }

    const invite = await (text_channel as any).createInvite({
      maxAge   : 0,
      maxUses  : 0,
      unique   : false,
      reason   : `Content Creator invite for ${member.user.tag}`,
    })

    return component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("5865F2"),
          components: [
            component.text("## <:OLOCK:1381580385892171816> Your Invite Link"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `Here is your personal invite link:`,
              ``,
              `\`https://discord.gg/${invite.code}\``,
              ``,
              `Share this link and earn **Rp 2.500** for every user who purchases a script after joining through your link.`,
            ]),
          ],
        }),
      ],
    })
  } catch {
    return component.build_message({
      components: [
        component.container({
          components: [
            component.text("## Error\nFailed to create invite link. Please try again later."),
          ],
        }),
      ],
    })
  }
}

// ─── cc panel: view invite logs ────────────────────────────────

/**
 * @description build invite log list for a cc
 * @param {string} cc_id    - cc user id
 * @param {string} guild_id - guild id
 * @returns {Promise<any>} component v2 message payload
 */
export async function build_invite_logs_message(cc_id: string, guild_id: string) {
  const invites = await cc_salary_manager.get_invites_by_cc(cc_id, guild_id)

  if (invites.length === 0) {
    return component.build_message({
      components: [
        component.container({
          components: [
            component.text("## Invite Logs\nNo invites recorded yet."),
          ],
        }),
      ],
    })
  }

  const sorted = invites.sort((a, b) => b.joined_at - a.joined_at).slice(0, 15)
  const lines  = sorted.map((inv, i) =>
    `${i + 1}. <@${inv.invited_user_id}> — ${time.relative_time(inv.joined_at)}`
  )

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("9B59B6"),
        components: [
          component.text("## Invite Logs"),
        ],
      }),
      component.container({
        components: [
          component.text([
            `Total Invites: **${invites.length}**`,
            ``,
            `### Recent Invites`,
            ...lines,
          ]),
        ],
      }),
    ],
  })
}

// ─── manager: check salary ─────────────────────────────────────

/**
 * @description build salary check message for a manager
 * @param {string} cc_id    - cc user id
 * @param {string} guild_id - guild id
 * @returns {Promise<any>} component v2 message payload
 */
export async function build_manager_check_message(cc_id: string, guild_id: string) {
  const salary = await cc_salary_manager.get_salary(cc_id, guild_id)

  const total_earned    = salary?.total_earned ?? 0
  const total_withdrawn = salary?.total_withdrawn ?? 0
  const balance         = salary?.balance ?? 0
  const total_invites   = salary?.total_invites ?? 0
  const total_sales     = salary?.total_sales ?? 0
  const updated_at      = salary?.updated_at ?? 0

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("57F287"),
        components: [
          component.text(`## CC Salary — <@${cc_id}>`),
        ],
      }),
      component.container({
        components: [
          component.text([
            `### Balance`,
            `- Current: **Rp ${balance.toLocaleString("id-ID")}**`,
            `- Total Earned: **Rp ${total_earned.toLocaleString("id-ID")}**`,
            `- Total Withdrawn: **Rp ${total_withdrawn.toLocaleString("id-ID")}**`,
          ]),
          component.divider(2),
          component.text([
            `### Stats`,
            `- Total Invites: **${total_invites}**`,
            `- Total Sales (converted): **${total_sales}**`,
            `- Last Updated: ${updated_at ? time.relative_time(updated_at) : "Never"}`,
          ]),
        ],
      }),
    ],
  })
}

// ─── manager: salary log ───────────────────────────────────────

/**
 * @description build salary log message for a manager
 * @param {string} cc_id    - cc user id
 * @param {string} guild_id - guild id
 * @returns {Promise<any>} component v2 message payload
 */
export async function build_salary_log_message(cc_id: string, guild_id: string) {
  const logs = await cc_salary_manager.get_logs(cc_id, guild_id)

  if (logs.length === 0) {
    return component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## Salary Log — <@${cc_id}>\nNo logs found.`),
          ],
        }),
      ],
    })
  }

  const type_labels: Record<string, string> = {
    earning    : "<:money:1381580383090380951> Earning",
    manual_add : "<:calc:1381580377340117002> Manual Add",
    reset      : "<:rbx:1447976733050667061> Reset",
    withdraw   : "<:JOBSS:1381580390330011732> Withdraw",
  }

  const sorted = logs.sort((a, b) => b.created_at - a.created_at).slice(0, 15)
  const lines  = sorted.map((log, i) => {
    const label = type_labels[log.type] ?? log.type
    return `${i + 1}. ${label} — **Rp ${log.amount.toLocaleString("id-ID")}**\n> ${log.note} — ${time.relative_time(log.created_at)}`
  })

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("E67E22"),
        components: [
          component.text(`## Salary Log — <@${cc_id}>`),
        ],
      }),
      component.container({
        components: [
          component.text([
            `Total Entries: **${logs.length}**`,
            ``,
            ...lines,
          ]),
        ],
      }),
    ],
  })
}

// ─── manager: leaderboard ──────────────────────────────────────

/**
 * @description build cc leaderboard
 * @param {string} guild_id - guild id
 * @returns {Promise<any>} component v2 message payload
 */
export async function build_leaderboard_message(guild_id: string) {
  const all_salaries = await cc_salary_manager.get_all_salaries(guild_id)

  if (all_salaries.length === 0) {
    return component.build_message({
      components: [
        component.container({
          components: [
            component.text("## CC Leaderboard\nNo content creators with salary records found."),
          ],
        }),
      ],
    })
  }

  const sorted = all_salaries.sort((a, b) => b.total_earned - a.total_earned).slice(0, 15)
  const lines  = sorted.map((s, i) => {
    const rank = i + 1
    return `${rank}. <@${s.cc_id}> — **Rp ${s.total_earned.toLocaleString("id-ID")}** earned | **${s.total_sales}** sales | **${s.total_invites}** invites`
  })

  return component.build_message({
    components: [
      component.container({
        accent_color: component.from_hex("F1C40F"),
        components: [
          component.text("## CC Salary Leaderboard"),
        ],
      }),
      component.container({
        components: [
          component.text([
            `Total Content Creators: **${all_salaries.length}**`,
            ``,
            ...lines,
          ]),
        ],
      }),
    ],
  })
}
