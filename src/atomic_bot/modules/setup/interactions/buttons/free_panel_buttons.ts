// - 免费面板按钮的交互注册 - \
// - registers free panel button interactions - \
import { ButtonInteraction, GuildMember } from "discord.js"
import { ButtonHandler }                  from "@shared/types/interaction"
import { component, db }                  from "@shared/utils"
import * as luarmor                       from "@atomic/infrastructure/api/luarmor"
import { is_hwid_enabled }                from "@atomic/modules/setup/commands/hwid_control"
import { get_channel_leaderboard, format_time } from "@shared/database/trackers/voice_time_tracker"

const __free_project_id     = "cd7560b7384fd815dafd993828c40d2b"
const __free_script_role_id = "1347086323575423048"
const __free_guild_id       = "1250337227582472243"
const __collection          = "free_script_users"

async function get_api_key(): Promise<string> {
  return process.env.LUARMOR_API_KEY || ""
}

async function get_free_user_key(discord_id: string): Promise<string | null> {
  const api_key = await get_api_key()
  const url     = `https://api.luarmor.net/v3/projects/${__free_project_id}/users?discord_id=${discord_id}`

  try {
    const res  = await fetch(url, { headers: { Authorization: api_key } })
    const data = await res.json() as any

    if (data?.users?.[0]?.user_key) return data.users[0].user_key
    if (data?.user_key) return data.user_key
    if (Array.isArray(data) && data[0]?.user_key) return data[0].user_key
  } catch {
    return null
  }
  return null
}

async function create_free_key(discord_id: string): Promise<string | null> {
  const api_key = await get_api_key()
  const url     = `https://api.luarmor.net/v3/projects/${__free_project_id}/users`

  try {
    const res  = await fetch(url, {
      method : "POST",
      headers: { Authorization: api_key, "Content-Type": "application/json" },
      body   : JSON.stringify({ discord_id }),
    })
    const data = await res.json() as any
    return data?.user_key || null
  } catch {
    return null
  }
}

async function reset_free_hwid(discord_id: string): Promise<boolean> {
  const user_key = await get_free_user_key(discord_id)
  if (!user_key) return false

  const api_key = await get_api_key()
  const url     = `https://api.luarmor.net/v3/projects/${__free_project_id}/users/resethwid`

  try {
    const res  = await fetch(url, {
      method : "POST",
      headers: { Authorization: api_key, "Content-Type": "application/json" },
      body   : JSON.stringify({ user_key }),
    })
    const data = await res.json() as any
    return data?.success === true || (data?.message || "").toLowerCase().includes("success")
  } catch {
    return false
  }
}

async function get_free_user_stats(discord_id: string): Promise<any | null> {
  const user_key = await get_free_user_key(discord_id)
  if (!user_key) return null

  const api_key = await get_api_key()
  const url     = `https://api.luarmor.net/v3/projects/${__free_project_id}/users?user_key=${user_key}`

  try {
    const res  = await fetch(url, { headers: { Authorization: api_key } })
    const data = await res.json() as any
    return data?.users?.[0] || data?.user_key ? data : null
  } catch {
    return null
  }
}

export const button: ButtonHandler = {
  custom_id: /^free_(get_script|reset_hwid|get_stats|leaderboard)$/,
  async execute(interaction: ButtonInteraction) {
    const action = interaction.customId.replace("free_", "")

    await interaction.deferReply({ flags: 64 })

    if (action === "get_script") {
      const member = interaction.member as GuildMember
      const user   = interaction.user

      const has_tag = user.primaryGuild?.tag && user.primaryGuild.identityGuildId === __free_guild_id

      if (!has_tag) {
        await interaction.editReply({
          content: "You must have the ATMC server tag on your profile to access the free script.",
        })
        return
      }

      let user_key = await get_free_user_key(user.id)

      if (!user_key) {
        user_key = await create_free_key(user.id)

        if (!user_key) {
          await interaction.editReply({
            content: "Failed to register you for the free script. Please try again later.",
          })
          return
        }

        try {
          await member.roles.add(__free_script_role_id)
        } catch {}

        if (db.is_connected()) {
          await db.update_one(__collection, { user_id: user.id }, {
            user_id   : user.id,
            guild_id  : __free_guild_id,
            username  : user.username,
            user_key,
            created_at: Math.floor(Date.now() / 1000),
            has_tag   : true,
          }, true)
        }
      }

      const loader = [
        `script_key="${user_key}";`,
        `loadstring(game:HttpGet("https://raw.githubusercontent.com/bimoraa/Euphoria/refs/heads/main/loader.luau"))()`,
      ].join("\n")

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Free Script",
                "Copy the script below and paste it into your executor.",
                "",
                "```lua",
                loader,
                "```",
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
      return
    }

    if (action === "reset_hwid") {
      const hwid_enabled = await is_hwid_enabled()
      if (!hwid_enabled) {
        await interaction.editReply({
          content: "HWID reset is currently disabled. Please wait for staff to re-enable it.",
        })
        return
      }

      const success = await reset_free_hwid(interaction.user.id)

      const message = component.build_message({
        components: [
          component.container({
            accent_color: success ? 0x57F287 : 0xED4245,
            components: [
              component.text(
                success
                  ? "## HWID Reset Successful\nYour HWID has been reset. You can now use the script on a new device."
                  : "## HWID Reset Failed\nYou may not be registered for the free script yet. Click **Get Script** first."
              ),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
      return
    }

    if (action === "get_stats") {
      const stats = await get_free_user_stats(interaction.user.id)

      if (!stats) {
        await interaction.editReply({
          content: "You are not registered for the free script. Click **Get Script** first.",
        })
        return
      }

      const expire_text = stats.auth_expire
        ? `<t:${stats.auth_expire}:F> (<t:${stats.auth_expire}:R>)`
        : "Permanent"

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `## Free Script Stats for ${interaction.user.username}`,
              ]),
            ],
          }),
          component.container({
            components: [
              component.text([
                `Status: ${stats.status || "active"}`,
                `Expiration: ${expire_text}`,
                `Total Executions: ${stats.total_executions ?? 0}`,
                `Total Resets: ${stats.total_resets ?? 0}`,
                `Last Execution: ${stats.last_execution || "Never"}`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
      return
    }

    if (action === "leaderboard") {
      const guild_id = interaction.guildId
      if (!guild_id) {
        await interaction.editReply({ content: "This can only be used in a server." })
        return
      }

      const records = await get_channel_leaderboard(guild_id, 10)

      if (records.length === 0) {
        await interaction.editReply({ content: "No execution data available yet." })
        return
      }

      const lines = records.map((r, i) =>
        `${i + 1}. <@${r.owner_id}> — ${format_time(r.duration_seconds)}`
      )

      const message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Free Script Execution Leaderboard",
                ...lines,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(message)
    }
  },
}
