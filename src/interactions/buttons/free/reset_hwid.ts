import { ButtonInteraction, GuildMember } from "discord.js"
import { component, api, format }        from "../../../utils"
import { http, env, logger }             from "../../../utils"

const __log              = logger.create_logger("free_reset_hwid")
const FREE_PROJECT_ID    = "cd7560b7384fd815dafd993828c40d2b"
const COOLDOWN_MS        = 3600000
const reset_cooldowns    = new Map<string, number>()

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

  const member      = interaction.member as GuildMember
  const now         = Date.now()
  const last_reset  = reset_cooldowns.get(member.id)

  if (last_reset && now - last_reset < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - last_reset)) / 1000 / 60)
    
    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Cooldown Active`,
                `You can reset your HWID again in **${remaining} minutes**.`,
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
              component.section({
                content: [
                  `## HWID Reset Successful`,
                  `Your hardware ID has been reset successfully!`,
                  ``,
                  `You can now use the script on a new device.`,
                  ``,
                  `-# Note: You can only reset your HWID a limited number of times.`,
                ],
                thumbnail : format.logo_url,
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

    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Error",
              "Failed to connect to server. Please try again later.",
            ]),
          ],
        }),
      ],
    }))
  }
}
