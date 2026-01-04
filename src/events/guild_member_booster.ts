import { Events, GuildMember, PartialGuildMember } from "discord.js"
import { client }                    from ".."
import { load_config }               from "../configuration/loader"
import { send_booster_log }          from "../interactions/controllers/booster_controller"
import * as booster_manager          from "../services/booster_manager"
import { log_error }                 from "../utils/error_logger"
import { format }                    from "../utils"

interface booster_config {
  booster_log_channel_id: string
  booster_media_url     : string
}

const config = load_config<booster_config>("booster")

client.on(Events.GuildMemberUpdate, async (old_member: GuildMember | PartialGuildMember, new_member: GuildMember) => {
  try {
    if (new_member.premiumSince && !old_member.premiumSince) {
      console.log(`[ - BOOSTER LOG - ] ${new_member.user.tag} started boosting the server`)

      const user_avatar = new_member.user.displayAvatarURL({ extension: "png", size: 256 })

      await send_booster_log(
        config.booster_log_channel_id,
        new_member.user.id,
        1,
        user_avatar
      )

      const whitelist_data = await booster_manager.get_whitelist(
        new_member.user.id,
        new_member.guild.id
      )

      if (whitelist_data) {
        await booster_manager.update_boost_count(
          new_member.user.id,
          new_member.guild.id,
          (whitelist_data.boost_count || 0) + 1
        )
      } else {
        await booster_manager.add_whitelist(
          new_member.user.id,
          new_member.guild.id,
          1
        )
      }
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
    await log_error(
      client,
      error instanceof Error ? error : new Error(String(error)),
      "booster_log",
      { user_id: new_member.user.id, guild_id: new_member.guild.id }
    )
  }
})
