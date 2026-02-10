import { ButtonInteraction } from "discord.js"
import { db }                from "@shared/utils"

/**
 * @param {ButtonInteraction} interaction - Button interaction
 * @returns {Promise<void>}
 */
export async function handle_bypass_mobile_copy(interaction: ButtonInteraction): Promise<void> {
  try {
    const [, user_id, cache_id] = interaction.customId.split(":")

    // - VERIFY USER AUTHORIZATION - \\
    if (interaction.user.id !== user_id) {
      await interaction.reply({
        content   : "This button is not for you!",
        ephemeral : true,
      })
      return
    }

    // - FETCH BYPASS RESULT FROM DATABASE - \\
    const cache_key = `bypass_result_${cache_id}`
    
    try {
      const result = await db.get_pool().query(
        `SELECT url FROM bypass_cache WHERE key = $1 AND expires_at > NOW()`,
        [cache_key]
      )

      if (!result.rows || result.rows.length === 0) {
        await interaction.reply({
          content   : "Bypass result has expired or not found. Please run the bypass command again.",
          ephemeral : true,
        })
        return
      }

      const bypass_key = result.rows[0].url

      await interaction.reply({
        content   : `\`${bypass_key}\``,
        ephemeral : true,
      })

      console.log(`[ - BYPASS MOBILE COPY - ] Sent mobile copy to user ${interaction.user.id}`)
    } catch (db_error) {
      console.error(`[ - BYPASS MOBILE COPY - ] Database error:`, db_error)
      await interaction.reply({
        content   : "Failed to retrieve bypass result. Please try again.",
        ephemeral : true,
      })
    }

  } catch (error: any) {
    console.error(`[ - BYPASS MOBILE COPY - ] Error:`, error)

    try {
      await interaction.reply({
        content   : "An error occurred while processing your request",
        ephemeral : true,
      })
    } catch (reply_error) {
      console.error(`[ - BYPASS MOBILE COPY - ] Failed to send error message:`, reply_error)
    }
  }
}
