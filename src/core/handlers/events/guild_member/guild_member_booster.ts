import { Events, GuildMember, PartialGuildMember } from "discord.js"
import { client }                    from "../../../.."
import { load_config }               from "../../../../shared/config/loader"
import { send_booster_log }          from "../../controllers/booster_controller"
import * as booster_manager          from "../../../../shared/database/managers/booster_manager"
import { log_error }                 from "../../../../shared/utils/error_logger"
import { format }                    from "../../../../shared/utils"

interface booster_config {
  booster_log_channel_id: string
  booster_media_url     : string
}

const config = load_config<booster_config>("booster")

client.on(Events.GuildMemberUpdate, async (old_member: GuildMember | PartialGuildMember, new_member: GuildMember) => {
  try {
    if (new_member.premiumSince && !old_member.premiumSince) {
      console.log(`[ - BOOSTER LOG - ] ${new_member.user.tag} started boosting the server`)

      const whitelist_data = await booster_manager.get_whitelist(
        new_member.user.id,
        new_member.guild.id
      )

      let new_boost_count = 1
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

      const user_avatar = new_member.user.displayAvatarURL({ extension: "png", size: 256 })

      await send_booster_log(
        config.booster_log_channel_id,
        new_member.user.id,
        new_boost_count,
        user_avatar
      )

      console.log(`[ - BOOSTER LOG - ] Logged boost for ${new_member.user.tag}, total boosts: ${new_boost_count}`)
    }

    if (!new_member.premiumSince && old_member.premiumSince) {
      console.log(`[ - BOOSTER LOG - ] ${new_member.user.tag} stopped boosting the server`)

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
    }

  } catch (error) {
    console.error(`[ - BOOSTER LOG - ] Error processing booster update:`, error)
    try {
      await log_error(
        client,
        error instanceof Error ? error : new Error(String(error)),
        "booster_log",
        { user_id: new_member.user.id, guild_id: new_member.guild.id }
      )
    } catch (log_err) {
      console.error(`[ - BOOSTER LOG - ] Failed to log error:`, log_err)
    }
  }
})
