import { component, api } from "../../../shared/utils"
import * as booster_manager from "../../../shared/database/booster_manager"

export async function send_booster_log(
  channel_id  : string,
  user_id     : string,
  boost_count : number,
  media_url   : string = ""
): Promise<void> {
  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Server Boosted!`,
              `> Thank you so much for boosting the server, <@${user_id}>!`,
              `> Total Boosts: **${boost_count}**`,
            ],
            media: media_url,
          }),
          ...(boost_count >= 2
            ? [
                component.action_row(
                  component.secondary_button("Claim your 1 month SP Key", `booster_claim_${user_id}`)
                ),
              ]
            : []),
        ],
      }),
    ],
  })

  await api.send_components_v2(channel_id, api.get_token(), message)
}

export async function handle_claim(user_id: string, guild_id: string): Promise<string> {
  const is_whitelisted = await booster_manager.is_whitelisted(user_id, guild_id)
  
  if (is_whitelisted) {
    return "You have already claimed your whitelist!"
  }

  const whitelist_data = await booster_manager.get_whitelist(user_id, guild_id)
  
  if (whitelist_data && whitelist_data.boost_count < 2) {
    return "You need at least 2 boosts to claim the whitelist!"
  }

  await booster_manager.add_whitelist(user_id, guild_id, whitelist_data?.boost_count || 2)
  
  return "Whitelist claimed successfully! You now have access to 1 month SP Key."
}
