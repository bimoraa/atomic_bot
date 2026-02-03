import { Events, GuildMember, PartialGuildMember } from "discord.js"
import { client }                    from "../../../.."
import { load_config }               from "../../../../shared/config/loader"
import { send_booster_log }          from "../../controllers/booster_controller"
import * as booster_manager          from "../../../../shared/database/managers/booster_manager"
import { log_error }                 from "../../../../shared/utils/error_logger"

interface booster_config {
  booster_log_channel_id: string
  booster_media_url     : string
}

client.on(Events.GuildMemberUpdate, async (old_member: GuildMember | PartialGuildMember, new_member: GuildMember) => {
  try {
    const is_boost_start = new_member.premiumSince && !old_member.premiumSince
    const is_boost_stop  = !new_member.premiumSince && old_member.premiumSince

    if (!is_boost_start && !is_boost_stop) return

    const config = load_config<booster_config>("booster")

    if (!config.booster_log_channel_id) {
      console.error("[ - BOOSTER LOG - ] Booster log channel id is missing")
      await log_error(
        client,
        new Error("Booster log channel id is missing"),
        "booster_log_config",
        {
          guild_id : new_member.guild.id,
        }
      )
      return
    }

    if (is_boost_start) {
      console.log(`[ - BOOSTER LOG - ] ${new_member.user.tag} started boosting the server`)

      let new_boost_count = 1

      try {
        const whitelist_data = await booster_manager.get_whitelist(
          new_member.user.id,
          new_member.guild.id
        )

        if (whitelist_data) {
          new_boost_count = (whitelist_data.boost_count || 0) + 1
          await booster_manager.update_boost_count(
            new_member.user.id,
            new_member.guild.id,
            new_boost_count
          )
        } else {
          await booster_manager.add_whitelist(
            new_member.user.id,
            new_member.guild.id,
            new_boost_count
          )
        }
      } catch (db_error) {
        console.error("[ - BOOSTER LOG - ] Failed to update boost count:", db_error)
        await log_error(
          client,
          db_error instanceof Error ? db_error : new Error(String(db_error)),
          "booster_log_db_update",
          {
            user_id  : new_member.user.id,
            guild_id : new_member.guild.id,
          }
        )
      }

      const user_avatar = new_member.user.displayAvatarURL({ extension: "png", size: 256 })

      await send_booster_log(
        client,
        config.booster_log_channel_id,
        new_member.user.id,
        new_boost_count,
        user_avatar
      )

      console.log(`[ - BOOSTER LOG - ] Logged boost for ${new_member.user.tag}, total boosts: ${new_boost_count}`)
    }

    if (is_boost_stop) {
      console.log(`[ - BOOSTER LOG - ] ${new_member.user.tag} stopped boosting the server`)

      try {
        const is_whitelisted = await booster_manager.is_whitelisted(
          new_member.user.id,
          new_member.guild.id
        )

        if (is_whitelisted) {
          await booster_manager.remove_whitelist(
            new_member.user.id,
            new_member.guild.id
          )
          console.log(`[ - BOOSTER LOG - ] Removed whitelist for ${new_member.user.tag}`)
        }
      } catch (db_error) {
        console.error("[ - BOOSTER LOG - ] Failed to remove whitelist:", db_error)
        await log_error(
          client,
          db_error instanceof Error ? db_error : new Error(String(db_error)),
          "booster_log_db_remove",
          {
            user_id  : new_member.user.id,
            guild_id : new_member.guild.id,
          }
        )
      }
    }

  } catch (error) {
    console.error(`[ - BOOSTER LOG - ] Error processing booster update:`, error)
    try {
      await log_error(
        client,
        error instanceof Error ? error : new Error(String(error)),
        "booster_log",
        {
          user_id  : new_member.user.id,
          guild_id : new_member.guild.id,
        }
      )
    } catch (log_err) {
      console.error(`[ - BOOSTER LOG - ] Failed to log error:`, log_err)
    }
  }
})
