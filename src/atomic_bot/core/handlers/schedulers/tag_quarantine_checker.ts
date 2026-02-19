import { Client }                                       from "discord.js"
import { logger }                                       from "@shared/utils"
import { get_auto_tag_quarantines, remove_quarantine }  from "@shared/database/managers/quarantine_manager"
import { component }                                    from "@shared/utils"
import { log_error }                                    from "@shared/utils/error_logger"

const log = logger.create_logger("tag_quarantine_checker")

const __target_guild_id    = "1250337227582472243"
const __server_tag_log_id  = "1457105102044139597"
const __quarantine_log_id  = "1474186051366031380"
const __banned_tags        = new Set(["LYNX", "ENVY", "ʟʏɴx", "HAJI"])
const __check_interval_ms  = 5 * 60 * 1000

/**
 * @description Start periodic checker that releases auto-tag-quarantines when banned tag is removed
 * @param client - Discord Client instance
 */
export function start_tag_quarantine_checker(client: Client): void {
  log.info("Starting tag quarantine checker")

  const run_check = async () => {
    try {
      const guild = client.guilds.cache.get(__target_guild_id)
      if (!guild) return

      const auto_quarantines = await get_auto_tag_quarantines(guild.id)
      if (auto_quarantines.length === 0) return

      log.info(`Checking ${auto_quarantines.length} auto-tag-quarantined members`)

      for (const entry of auto_quarantines) {
        try {
          // - FETCH FRESH USER DATA FROM API TO GET CURRENT TAG - \\
          const member = await guild.members.fetch(entry.user_id).catch(() => null)
          if (!member) continue

          const user    = await client.users.fetch(entry.user_id, { force: true }).catch(() => null)
          if (!user) continue

          const cur_tag         = user.primaryGuild?.tag
          const still_banned    = cur_tag ? __banned_tags.has(cur_tag) : false

          if (still_banned) continue

          // - TAG REMOVED, RELEASE QUARANTINE - \\
          const managed_roles = member.roles.cache
            .filter(r => r.managed || r.id === guild.id)
            .map(r => r.id)

          const valid_roles = entry.previous_roles.filter(rid => guild.roles.cache.has(rid))
          await member.roles.set([...managed_roles, ...valid_roles], "Auto-released: no longer using banned server tag")
          await remove_quarantine(entry.user_id, guild.id)

          log.info(`Released ${user.username} (tag no longer banned)`)

          // - SEND RELEASE LOG TO BOTH CHANNELS - \\
          const release_msg = component.build_message({
            components: [
              component.container({
                accent_color : 0x57F287,
                components   : [
                  component.section({
                    content   : [
                      `## Auto Release - Banned Server Tag Removed`,
                      `<@${entry.user_id}> was automatically released from quarantine`,
                    ],
                    thumbnail : user.displayAvatarURL({ size: 256 }),
                  }),
                ],
              }),
            ],
          })

          const server_log_ch    = guild.channels.cache.get(__server_tag_log_id)
          const quarantine_log_ch = guild.channels.cache.get(__quarantine_log_id)
          if (server_log_ch?.isTextBased())    await server_log_ch.send(release_msg).catch(() => {})
          if (quarantine_log_ch?.isTextBased()) await quarantine_log_ch.send(release_msg).catch(() => {})
        } catch (member_err) {
          log.error(`Error checking member ${entry.user_id}:`, member_err)
        }
      }
    } catch (error) {
      log.error("Error in tag quarantine checker:", error)
      await log_error(client, error as Error, "Tag Quarantine Checker", {
        guild_id: __target_guild_id,
      }).catch(() => {})
    }
  }

  // - RUN INITIAL CHECK AFTER 15 SECONDS - \\
  setTimeout(run_check, 15000)

  // - RUN CHECK EVERY 5 MINUTES - \\
  setInterval(run_check, __check_interval_ms)

  log.info("Tag quarantine checker started")
}
