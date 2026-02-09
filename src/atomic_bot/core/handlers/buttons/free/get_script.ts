import { ButtonInteraction, GuildMember }      from "discord.js"
import { component, api, format }              from "@shared/utils"
import { http, env, logger, db }               from "@shared/utils"
import { remove_free_script_access }           from "@shared/database/managers/free_script_manager"
import { create_rate_limit_message }           from "../../controllers/service_provider_controller"

const __log                  = logger.create_logger("free_script")
const FREE_PROJECT_ID        = "cd7560b7384fd815dafd993828c40d2b"
const FREE_SCRIPT_ROLE_ID    = "1347086323575423048"
const FREE_LOADER_PROJECT_ID = "1bf4ff7a5e613f8aec76d84316949913"
const TARGET_GUILD_ID        = "1250337227582472243"

function get_api_key(): string {
  return env.required("LUARMOR_API_KEY")
}

function get_headers(): Record<string, string> {
  return {
    Authorization : get_api_key(),
  }
}

export async function handle_free_get_script(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  await interaction.deferReply({ ephemeral: true })

  try {
    const user = member.user

    if (!user.primaryGuild?.tag || user.primaryGuild.identityGuildId !== TARGET_GUILD_ID) {
      await remove_free_script_access(member.id)

      if (member.roles.cache.has(FREE_SCRIPT_ROLE_ID)) {
        await member.roles.remove(FREE_SCRIPT_ROLE_ID).catch(() => {})
      }

      const no_tag_message = component.build_message({
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
                  "TUTORIAL - Credit: Moltres",
                ),
                component.gallery_item(
                  "https://cdn.discordapp.com/attachments/1396090293987704913/1458975493905711124/Perekaman_Layar_2026-01-09_pukul_07.06.02.mov?ex=69619850&is=696046d0&hm=96199f3b1266a08fa2c7d4ff82237ee666ccfd5b99b1699801e395e54434b92e&",
                  "Desktop Tutorial",
                ),
              ]),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, no_tag_message)
      return
    }

    const check_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users?discord_id=${member.id}`
    const check_res = await http.get<any>(check_url, get_headers())

    __log.info("Free script check response:", JSON.stringify(check_res))

    let user_key: string | null = null
    let user_exists = false

    if (check_res.users && Array.isArray(check_res.users) && check_res.users.length > 0) {
      user_exists = true
      user_key = check_res.users[0].user_key
    } else if (check_res.user_key) {
      user_exists = true
      user_key = check_res.user_key
    } else if (Array.isArray(check_res) && check_res.length > 0) {
      user_exists = true
      user_key = check_res[0].user_key
    }

    if (!user_exists) {
      const create_url = `https://api.luarmor.net/v3/projects/${FREE_PROJECT_ID}/users`
      const create_body = {
        discord_id : member.id,
        note       : "tab_limit 1234;",
      }

      const create_res = await http.post<any>(create_url, create_body, get_headers())

      __log.info("Free script create response:", JSON.stringify(create_res))

      if (!create_res.user_key) {
        await api.edit_deferred_reply(interaction, component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Error",
                  "Failed to create your account. Please try again later",
                ]),
              ],
            }),
          ],
        }))
        return
      }

      user_key = create_res.user_key

      try {
        await member.roles.add(FREE_SCRIPT_ROLE_ID)
      } catch (error) {
        __log.error("Failed to add role:", error)
      }

      await db.update_one(
        "free_script_users",
        { user_id: member.id },
        {
          user_id    : member.id,
          guild_id   : TARGET_GUILD_ID,
          username   : member.user.username,
          user_key   : user_key,
          created_at : Date.now(),
          has_tag    : true,
        },
        true
      )
    }

    if (!user_key) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "Failed to retrieve your key. Please try again later.",
              ]),
            ],
          }),
        ],
      }))
      return
    }

    if (!member.roles.cache.has(FREE_SCRIPT_ROLE_ID)) {
      try {
        await member.roles.add(FREE_SCRIPT_ROLE_ID)
      } catch (error) {
        __log.error("Failed to add role:", error)
      }
    }

    const loader_script = [
      `script_key="${user_key}"`,
      `loadstring(game:HttpGet("https://api.luarmor.net/files/v3/loaders/${FREE_LOADER_PROJECT_ID}.lua"))()`,
    ].join("\n")

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Your Free Loader Script`,
                `Copy and paste this script into your executor:`,
                ``,
                `\`\`\`lua`,
                loader_script,
                `\`\`\``,
                ``,
                `-# You have been whitelisted and received the script role!`,
              ],
              thumbnail : format.logo_url,
            }),
            component.action_row(
              component.secondary_button("Mobile Copy", "free_mobile_copy"),
            ),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  } catch (error) {
    __log.error("Failed to process free script:", error)

    await api.edit_deferred_reply(interaction, create_rate_limit_message("Free Script"))
  }
}

export async function handle_free_mobile_copy(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.member as GuildMember

  await interaction.deferReply({ ephemeral: true })

  const user = member.user

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

    let user_key: string | null = null

    if (check_res.users && Array.isArray(check_res.users) && check_res.users.length > 0) {
      user_key = check_res.users[0].user_key
    } else if (check_res.user_key) {
      user_key = check_res.user_key
    } else if (Array.isArray(check_res) && check_res.length > 0) {
      user_key = check_res[0].user_key
    }

    if (!user_key) {
      await interaction.editReply({
        content : "You don't have access to the free script. Click \"Get Script\" first.",
      })
      return
    }

    const loader_script = [
      `script_key="${user_key}"`,
      `loadstring(game:HttpGet("https://api.luarmor.net/files/v3/loaders/${FREE_LOADER_PROJECT_ID}.lua"))()`,
    ].join("\n")

    const mobile_copy = loader_script.replace(/\n/g, " ")

    await interaction.editReply({
      content : `\`${mobile_copy}\``,
    })
  } catch (error) {
    __log.error("Failed to get mobile copy:", error)

    await interaction.editReply({
      content : "Failed to retrieve your script. Please try again later.",
    })
  }
}
