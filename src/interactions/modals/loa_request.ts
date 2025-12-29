import { ModalSubmitInteraction } from "discord.js"
import { request_loa }            from "../controller/loa_controller"
import { db }                     from "../../utils"

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

  await db.insert_one("loa_requests", {
    ...result.data,
    message_id: message.id,
  })

  return true
}