import { ModalSubmitInteraction } from "discord.js"
import { request_loa }            from "../controllers/loa_controller"
import { db }                     from "../../../shared/utils"
import { log_error }              from "../../../shared/utils/error_logger"

export async function handle_loa_request_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "loa_request_modal") return false

  const end_date_input = interaction.fields.getTextInputValue("loa_end_date")
  const type_input     = interaction.fields.getTextInputValue("loa_type")
  const reason_input   = interaction.fields.getTextInputValue("loa_reason")

  const result = await request_loa({
    user_id   : interaction.user.id,
    user_tag  : interaction.user.tag,
    client    : interaction.client,
    end_date  : end_date_input,
    type      : type_input,
    reason    : reason_input,
    guild_id  : interaction.guild?.id,
    channel_id: interaction.channel?.id,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to submit LOA request",
      ephemeral: true,
    })
    return true
  }

  const message = await interaction.reply({
    ...result.message,
    fetchReply: true,
  })

  const loa_data = {
    ...result.data,
    message_id: message.id,
  }

  console.log(`[ - LOA REQUEST - ] Inserting LOA data:`, JSON.stringify(loa_data, null, 2))
  console.log(`[ - LOA REQUEST - ] Timestamp details:`)
  console.log(`  - start_date: ${loa_data.start_date} (type: ${typeof loa_data.start_date})`)
  console.log(`  - end_date: ${loa_data.end_date} (type: ${typeof loa_data.end_date})`)
  console.log(`  - created_at: ${loa_data.created_at} (type: ${typeof loa_data.created_at})`)

  try {
    const insert_result = await db.insert_one("loa_requests", loa_data)

    console.log(`[ - LOA REQUEST - ] Insert successful with id: ${insert_result}`)

    const verify = await db.find_one("loa_requests", { message_id: message.id })
    console.log(`[ - LOA REQUEST - ] Verification - Retrieved data:`, JSON.stringify(verify, null, 2))
  } catch (insert_error) {
    console.error(`[ - LOA REQUEST - ] Failed to insert LOA data:`, insert_error)
    await log_error(interaction.client, insert_error as Error, "LOA Request Insert", {
      user_id   : interaction.user.id,
      message_id: message.id,
    }).catch(() => {})

    await interaction.followUp({
      content  : "LOA request submitted but failed to save. Please contact an administrator.",
      ephemeral: true,
    }).catch(() => {})
  }

  return true
}