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

export async function handle_loa_reject(interaction: ButtonInteraction): Promise<void> {
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
      content  : "You don't have permission to reject LOA requests",
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

    await db.update_one(
      "loa_requests",
      { message_id: interaction.message.id },
      {
        status     : "rejected",
        rejected_by: interaction.user.id,
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
            component.text(`- Rejected by: <@${interaction.user.id}>`),
          ],
        }),
      ],
    })

    await interaction.update(updated_message)
  } catch (err) {
    await log_error(interaction.client, err as Error, "LOA Reject", {
      user      : interaction.user.tag,
      user_id   : interaction.user.id,
      message_id: interaction.message.id,
    }).catch(() => {})

    await interaction.reply({
      content  : "Failed to reject LOA request",
      ephemeral: true,
    }).catch(() => {})
  }
}
