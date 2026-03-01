import { ButtonInteraction, AttachmentBuilder } from "discord.js"
import { db }                                   from "@shared/utils"

const __dev_id = "1118453649727823974"

/**
 * - VIEW REQUEST LOG BUTTON - \\
 *
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_bypass_request_log(interaction: ButtonInteraction): Promise<void> {
  try {
    // - DEVELOPER ONLY - \\
    if (interaction.user.id !== __dev_id) {
      await interaction.reply({
        content   : "This button is restricted to developers only.",
        ephemeral : true,
      })
      return
    }

    const log_key = `bypass_log_${interaction.customId.split(":")[1]}`

    const result = await db.get_pool().query(
      `SELECT url FROM bypass_cache WHERE key = $1 AND expires_at > NOW()`,
      [log_key]
    )

    if (!result.rows || result.rows.length === 0) {
      await interaction.reply({
        content   : "Log expired or not found.",
        ephemeral : true,
      })
      return
    }

    const log_text = result.rows[0].url
    const buffer   = Buffer.from(log_text, "utf-8")

    await interaction.reply({
      files     : [new AttachmentBuilder(buffer, { name: `bypass_log_${log_key}.txt` })],
      ephemeral : true,
    })

    console.warn(`[ - BYPASS REQUEST LOG - ] Sent log to developer ${interaction.user.tag}`)
  } catch (error) {
    console.error(`[ - BYPASS REQUEST LOG - ] Error:`, error)
    try {
      await interaction.reply({
        content   : "Failed to retrieve log.",
        ephemeral : true,
      })
    } catch { /* already replied */ }
  }
}
