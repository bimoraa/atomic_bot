import { ButtonInteraction, GuildMember }      from "discord.js"
import { component, api, format }              from "@shared/utils"
import { http, env, logger }                   from "@shared/utils"
import { remove_free_script_access }           from "@shared/database/managers/free_script_manager"
import { track_and_check_hwid_reset, create_rate_limit_message } from "../../controllers/service_provider_controller"
import { is_hwid_enabled }                     from "../../../../modules/setup/hwid_control"

const __log               = logger.create_logger("free_reset_hwid")
const FREE_PROJECT_ID     = "cd7560b7384fd815dafd993828c40d2b"
const FREE_SCRIPT_ROLE_ID = "1347086323575423048"
const TARGET_GUILD_ID     = "1250337227582472243"
const COOLDOWN_MS         = 3600000
const reset_cooldowns     = new Map<string, number>()

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_headers(): Record<string, string> {
  return {
    Authorization : get_api_key(),
  }
}

export async function handle_free_reset_hwid(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const hwid_enabled = await is_hwid_enabled()
  if (!hwid_enabled) {
    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("#ED4245"),
          components  : [
            component.text([
              "## HWID Reset Disabled",
              "HWID reset functionality is currently disabled.",
              "",
              "Please contact an administrator for assistance.",
            ]),
          ],
        }),
      ],
    }))
    return
  }

  const member      = interaction.member as GuildMember
  const user        = member.user

  if (!user.primaryGuild?.tag || user.primaryGuild.identityGuildId !== TARGET_GUILD_ID) {
    await remove_free_script_access(member.id)

    if (member.roles.cache.has(FREE_SCRIPT_ROLE_ID)) {
      await member.roles.remove(FREE_SCRIPT_ROLE_ID).catch(() => {})
    }

    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components: [
            component.text([
              `## Server Tag Required`,
              `You must wear the ATMC server tag to use free script features`,
              ``,
              `You have been unwhitelisted. Set the server tag and click "Get Script" again`,
            ]),
          ],
        }),
      ],
    }))
    return
  }

  const now         = Date.now()
  const last_reset  = reset_cooldowns.get(member.id)

  if (last_reset && now - last_reset < COOLDOWN_MS) {
    const retry_at = Math.floor((last_reset + COOLDOWN_MS) / 1000)
    
    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Cooldown Active`,
                `You can reset your HWID again <t:${retry_at}:R>.`,
                ``,
                `-# This cooldown prevents abuse.`,
              ],
              thumbnail : format.logo_url,
            }),
          ],
        }),
      ],
    }))
    return
  }

  try {
    const check_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users?discord_id=${member.id}`
    const check_res = await http.get<any>(check_url, get_headers())

    let user_key: string | null = null

    if (check_res.users && Array.isArray(check_res.users) && check_res.users.length > 0) {
      user_key = check_res.users[0].user_key
    } else if (check_res.user_key) {
      user_key = check_res.user_key
    } else if (Array.isArray(check_res) && check_res.length > 0) {
      user_key = check_res[0].user_key
    }

    if (!user_key) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## No Key Found`,
                  `You don't have access to the free script.`,
                  ``,
                  `Please use the **Get Script** button first.`,
                ],
                thumbnail : format.logo_url,
              }),
            ],
          }),
        ],
      }))
      return
    }

    // - TRACK RESET ATTEMPT BEFORE API CALL - \\
    await track_and_check_hwid_reset(interaction.client, member.id)

    const reset_url  = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users/resethwid`
    const reset_body = { user_key }
    const reset_res  = await http.post<any>(reset_url, reset_body, get_headers())

    __log.info("Free reset hwid response:", JSON.stringify(reset_res))

    if (reset_res.success === true || reset_res.message?.toLowerCase().includes("success")) {
      reset_cooldowns.set(member.id, now)
      
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text("## HWID Reset Successful\nYour hardware ID has been reset successfully!"),
              component.divider(2),
              component.section({
                content: "You can now use the script on a new device.",
                accessory: component.secondary_button("View Stats", "free_get_stats"),
              }),
            ],
          }),
        ],
      }))
    } else {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content: [
                  `## Reset Failed`,
                  `${reset_res.message || "Failed to reset HWID"}`,
                ],
                thumbnail : format.logo_url,
              }),
            ],
          }),
        ],
      }))
    }
  } catch (error) {
    __log.error("Failed to reset hwid:", error)

    await api.edit_deferred_reply(interaction, create_rate_limit_message("HWID Reset"))
  }
}
