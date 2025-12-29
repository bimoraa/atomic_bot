import { ButtonInteraction } from "discord.js"
import { db, component, time, api } from "../../../utils"
import { log_error }                from "../../../utils/error_logger"

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

export async function handle_loa_end(interaction: ButtonInteraction): Promise<void> {
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
      content  : "You don't have permission to end LOA requests",
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

    if (loa.status !== "approved") {
      await interaction.reply({
        content  : `This LOA is ${loa.status}, cannot end`,
        ephemeral: true,
      })
      return
    }

    const member = await interaction.guild.members.fetch(loa.user_id).catch(() => null)
    if (member) {
      await member.roles.remove("1274580813912211477").catch(() => {})
      
      if (loa.original_nickname) {
        await member.setNickname(loa.original_nickname).catch(() => {})
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
              component.text(`- Ended by: <@${interaction.user.id}>`),
              component.divider(2),
              component.text("Your role and nickname have been restored."),
            ],
          }),
        ],
      })

      await api.send_dm(loa.user_id, discord_token, dm_message).catch(() => {})
    }

    await db.update_one("loa_requests", { message_id: interaction.message.id }, { status: "ended" })

    const updated_message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("95A5A6"),
          components  : [
            component.text("## Leave of Absence - Ended"),
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
            component.text(`- Approved by: <@${loa.approved_by}>`),
            component.text(`- Ended by: <@${interaction.user.id}>`),
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

    await interaction.update(updated_message)
  } catch (err) {
    await log_error(interaction.client, err as Error, "LOA End", {
      user      : interaction.user.tag,
      user_id   : interaction.user.id,
      message_id: interaction.message.id,
    }).catch(() => {})

    await interaction.reply({
      content  : "Failed to end LOA request",
      ephemeral: true,
    }).catch(() => {})
  }
}
