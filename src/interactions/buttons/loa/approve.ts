import { ButtonInteraction } from "discord.js"
import { db, component, time } from "../../../utils"
import { log_error }           from "../../../utils/error_logger"

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
  status            : "pending" | "approved" | "rejected"
  approved_by?      : string
  rejected_by?      : string
  original_nickname?: string
  created_at        : number
  guild_id?         : string
  channel_id?       : string
}

export async function handle_loa_approve(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content  : "This can only be used in a server",
      ephemeral: true,
    })
    return
  }

  const member_roles = interaction.member.roles as any
  const has_permission = loa_manager_roles.some(role_id =>
    member_roles.cache?.has(role_id) || member_roles.includes?.(role_id)
  )

  if (!has_permission) {
    await interaction.reply({
      content  : "You don't have permission to approve LOA requests",
      ephemeral: true,
    })
    return
  }

  try {
    const loa = await db.find_one<loa_data>("loa_requests", {
      message_id: interaction.message.id,
    })

    if (!loa) {
      await interaction.reply({
        content  : "LOA request not found",
        ephemeral: true,
      })
      return
    }

    if (loa.status !== "pending") {
      await interaction.reply({
        content  : `This request has already been ${loa.status}`,
        ephemeral: true,
      })
      return
    }

    let original_nickname: string | null = null

    try {
      const guild  = interaction.guild
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
      await log_error(interaction.client, role_err as Error, "LOA Role/Nickname", {
        user_id: loa.user_id,
        user_tag: loa.user_tag,
      }).catch(() => {})
    }

    await db.update_one(
      "loa_requests",
      { message_id: interaction.message.id },
      {
        status           : "approved",
        approved_by      : interaction.user.id,
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
            component.text(`- Approved by: <@${interaction.user.id}>`),
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

    await interaction.update(updated_message)
  } catch (err) {
    await log_error(interaction.client, err as Error, "LOA Approve", {
      user     : interaction.user.tag,
      user_id  : interaction.user.id,
      message_id: interaction.message.id,
    }).catch(() => {})

    await interaction.reply({
      content  : "Failed to approve LOA request",
      ephemeral: true,
    }).catch(() => {})
  }
}
