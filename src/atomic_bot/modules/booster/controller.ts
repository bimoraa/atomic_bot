import { Client }            from "discord.js"
import { component, api }    from "@shared/utils"
import { log_error }         from "@shared/utils/error_logger"
import * as booster_manager  from "@shared/database/managers/booster_manager"

/**
 * - WAIT FOR MS - \\
 * @param ms Delay in milliseconds
 * @returns {Promise<void>} Resolves after delay
 */
function wait_ms(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * - SEND BOOSTER LOG - \\
 * @param client Discord client
 * @param channel_id Target channel id
 * @param user_id Booster user id
 * @param boost_count Total boost count
 * @param media_url Optional media url
 * @returns {Promise<api.api_response>} API response
 */
export async function send_booster_log(
  client      : Client,
  channel_id  : string,
  user_id     : string,
  boost_count : number,
  media_url   : string = ""
): Promise<api.api_response> {
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

  let response: api.api_response = { error: true }

  try {
    response = await api.send_components_v2(channel_id, api.get_token(), message)
  } catch (send_error) {
    console.error("[ - BOOSTER LOG - ] First send attempt threw:", send_error)
  }

  if (response.error) {
    const retry_after_value = typeof response.retry_after === "number"
      ? response.retry_after
      : null
    const retry_after_ms    = retry_after_value
      ? retry_after_value > 1000 ? retry_after_value : Math.ceil(retry_after_value * 1000)
      : 1500

    // - RETRY ONCE AFTER COOLDOWN - \\
    await wait_ms(retry_after_ms)

    try {
      response = await api.send_components_v2(channel_id, api.get_token(), message)
    } catch (retry_error) {
      console.error("[ - BOOSTER LOG - ] Retry attempt threw:", retry_error)
    }
  }

  if (response.error) {
    console.error("[ - BOOSTER LOG - ] Failed to send booster log:", response)
    await log_error(
      client,
      new Error("Failed to send booster log"),
      "booster_log_send",
      {
        channel_id  : channel_id,
        user_id     : user_id,
        boost_count : boost_count,
        response    : response,
      }
    )
  }

  return response
}

/**
 * - HANDLE BOOSTER CLAIM - \\
 * @param user_id Booster user id
 * @param guild_id Guild id
 * @returns {Promise<string>} Result message
 */
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
