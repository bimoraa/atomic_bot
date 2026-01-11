import { ButtonInteraction, GuildMember }      from "discord.js"
import { component, api, format }              from "../../../../shared/utils"
import { http, env, logger }                   from "../../../../shared/utils"
import { remove_free_script_access }           from "../../../../shared/database/managers/free_script_manager"
import { create_rate_limit_message }           from "../../controllers/service_provider_controller"

const __log               = logger.create_logger("free_stats")
const FREE_PROJECT_ID     = "cd7560b7384fd815dafd993828c40d2b"
const FREE_SCRIPT_ROLE_ID = "1347086323575423048"
const TARGET_GUILD_ID     = "1250337227582472243"

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_headers(): Record<string, string> {
  return {
    Authorization : get_api_key(),
  }
}

export async function handle_free_get_stats(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true })

  const member = interaction.member as GuildMember
  const user   = member.user

  if (!user.primaryGuild?.tag || user.primaryGuild.identityGuildId !== TARGET_GUILD_ID) {
    await remove_free_script_access(member.id)

    if (member.roles.cache.has(FREE_SCRIPT_ROLE_ID)) {
      await member.roles.remove(FREE_SCRIPT_ROLE_ID).catch(() => {})
    }

    await api.edit_deferred_reply(interaction, component.build_message({
      components: [
        component.container({
          accent_color: 15158332,
          components: [
            component.text([
              "## Server Tag Required",
              "To use the free script, you must wear the ATMC server tag",
            ]),
            component.divider(2),
            component.text([
              "### How to equip the server tag:",
              "",
              "1. User Settings -> Profile",
              "2. Server Tag Section",
              "3. Select this server and equip **ATMC**",
            ]),
            component.divider(2),
            component.media_gallery([
              component.gallery_item(
                "https://cdn.discordapp.com/attachments/1457787260966801602/1457787261859922093/ScreenRecording_01-04-2026_17-09-32_1.mp4?ex=69613a2f&is=695fe8af&hm=bea369e124ba0594c20bc1449a10e68664a1d1c9b0372b2d955884f483c90be9&",
                "Mobile Tutorial - Credit: Moltres",
              ),
              component.gallery_item(
                "https://cdn.discordapp.com/attachments/1396090293987704913/1458975493905711124/Perekaman_Layar_2026-01-09_pukul_07.06.02.mov?ex=69619850&is=696046d0&hm=96199f3b1266a08fa2c7d4ff82237ee666ccfd5b99b1699801e395e54434b92e&",
                "Desktop Tutorial",
              ),
            ]),
          ],
        }),
      ],
    }))
    return
  }

  try {
    const check_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users?discord_id=${member.id}`
    const check_res = await http.get<any>(check_url, get_headers())

    let user: any = null

    if (check_res.users && Array.isArray(check_res.users) && check_res.users.length > 0) {
      user = check_res.users[0]
    } else if (check_res.user_key) {
      user = check_res
    } else if (Array.isArray(check_res) && check_res.length > 0) {
      user = check_res[0]
    }

    if (!user) {
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

    const all_users_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users`
    const all_users_res = await http.get<any>(all_users_url, get_headers())

    let leaderboard_text = "Unable to fetch leaderboard"

    if (all_users_res.users && Array.isArray(all_users_res.users)) {
      const sorted = all_users_res.users.sort((a: any, b: any) => b.total_executions - a.total_executions)
      const rank   = sorted.findIndex((u: any) => u.discord_id === member.id) + 1
      
      if (rank > 0) {
        leaderboard_text = `You are #${rank} of ${sorted.length} users`
      } else {
        leaderboard_text = `Not ranked yet (${sorted.length} total users)`
      }
    }

    const hwid_status   = user.identifier ? "Assigned" : "Not Assigned"
    const last_reset_ts = user.last_reset > 0 ? `<t:${user.last_reset}:R>` : "Never"
    const expires_text  = user.auth_expire === -1 ? "Never" : `<t:${user.auth_expire}:R>`
    const banned_text   = user.banned === 1 ? `Yes - ${user.ban_reason || "No reason"}` : "No"
    const note_text     = user.note || "Not specified"

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Your Script Statistics`,
                `${leaderboard_text}`,
                ``,
                `- **Total Executions:** ${user.total_executions}`,
                `- **HWID Status:** ${hwid_status}`,
                `- **Key:** ||${user.user_key}||`,
                `- **Total HWID Resets:** ${user.total_resets}`,
                `- **Last Reset:** ${last_reset_ts}`,
                `- **Expires At:** ${expires_text}`,
                `- **Banned:** ${banned_text}`,
                `- **Note:** ${note_text}`,
              ],
              thumbnail : format.logo_url,
            }),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } catch (error) {
    __log.error("Failed to get stats:", error)

    await api.edit_deferred_reply(interaction, create_rate_limit_message("Stats"))
  }
}
