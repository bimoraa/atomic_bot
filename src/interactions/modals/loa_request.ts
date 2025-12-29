import { ModalSubmitInteraction } from "discord.js"
import { component, time, db }    from "../../utils"
import { log_error }              from "../../utils/error_logger"

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
  original_nickname?: string
  created_at        : number
  guild_id?         : string
  channel_id?       : string
}

export async function handle_loa_request_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "loa_request_modal") return false

  try {
    const end_date_input = interaction.fields.getTextInputValue("loa_end_date")
    const type_input     = interaction.fields.getTextInputValue("loa_type")
    const reason_input   = interaction.fields.getTextInputValue("loa_reason")

    const date_match = end_date_input.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!date_match) {
      await interaction.reply({
        content  : "Invalid date format. Please use YYYY-MM-DD format (e.g., 2025-12-31)",
        ephemeral: true,
      })
      return true
    }

    const [, year, month, day] = date_match
    const end_date = new Date(`${year}-${month}-${day}T00:00:00Z`)
    
    if (isNaN(end_date.getTime())) {
      await interaction.reply({
        content  : "Invalid date. Please check your input",
        ephemeral: true,
      })
      return true
    }

    const now           = Math.floor(Date.now() / 1000)
    const end_timestamp = Math.floor(end_date.getTime() / 1000)

    if (end_timestamp <= now) {
      await interaction.reply({
        content  : "End date must be in the future",
        ephemeral: true,
      })
      return true
    }

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
              `- Requester: <@${interaction.user.id}>`,
              `- Start Date: ${time.full_date_time(now)}`,
              `- End Date: ${time.full_date_time(end_timestamp)}`,
            ]),
            component.divider(2),
            component.text([
              `- Type of Leave: ${type_input}`,
              `- Reason: ${reason_input}`,
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

    const message = await interaction.reply({
      ...loa_message,
      fetchReply: true,
    })

    const loa: loa_data = {
      message_id : message.id,
      user_id    : interaction.user.id,
      user_tag   : interaction.user.tag,
      start_date : now,
      end_date   : end_timestamp,
      type       : type_input,
      reason     : reason_input,
      status     : "pending",
      created_at : now,
      guild_id   : interaction.guild?.id,
      channel_id : interaction.channel?.id,
    }

    await db.insert_one("loa_requests", loa)

    return true
  } catch (err) {
    await log_error(interaction.client, err as Error, "LOA Request Modal", {
      user   : interaction.user.tag,
      user_id: interaction.user.id,
    }).catch(() => {})

    await interaction.reply({
      content  : "Failed to submit LOA request",
      ephemeral: true,
    }).catch(() => {})

    return true
  }
}
