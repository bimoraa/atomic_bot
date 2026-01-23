import { Client }                   from "discord.js"
import { logger }                   from "../../../shared/utils"
import { get_expired_quarantines }  from "../../../shared/database/managers/quarantine_manager"
import { release_quarantine }       from "../controllers/quarantine_controller"

const log = logger.create_logger("quarantine_scheduler")

/**
 * @description Start quarantine auto-release scheduler
 * @param client - Discord Client instance
 */
export async function start_quarantine_scheduler(client: Client): Promise<void> {
  log.info("Starting quarantine auto-release scheduler")

  const check_and_release = async () => {
    try {
      const expired = await get_expired_quarantines()

      if (expired.length === 0) {
        return
      }

      log.info(`Found ${expired.length} expired quarantines to process`)

      for (const quarantine of expired) {
        try {
          const guild = await client.guilds.fetch(quarantine.guild_id).catch(() => null)
          if (!guild) {
            log.warn(`Guild ${quarantine.guild_id} not found, skipping`)
            continue
          }

          const result = await release_quarantine({
            client,
            guild,
            user_id: quarantine.user_id,
          })

          if (result.success) {
            log.info(`Released quarantine for user ${quarantine.user_id} in guild ${quarantine.guild_id}`)
          } else {
            log.error(`Failed to release quarantine for user ${quarantine.user_id}: ${result.error}`)
          }
        } catch (err) {
          log.error(`Error processing quarantine for user ${quarantine.user_id}:`, err)
        }
      }
    } catch (error) {
      log.error("Error in quarantine scheduler:", error)
    }
  }

  // - RUN CHECK EVERY 5 MINUTES - \\
  setInterval(check_and_release, 5 * 60 * 1000)

  // - RUN INITIAL CHECK AFTER 10 SECONDS - \\
  setTimeout(check_and_release, 10000)

  log.info("Quarantine scheduler started successfully")
}
