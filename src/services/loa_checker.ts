import { Client } from "discord.js"
import { db, api, component } from "../utils"

const is_dev        = process.env.NODE_ENV === "development"
const discord_token = is_dev ? process.env.DEV_DISCORD_TOKEN : process.env.DISCORD_TOKEN

interface loa_data {
  id?               : any
  message_id        : string
  user_id           : string
  user_tag          : string
  start_date        : number
  end_date          : number
  type              : string
  reason            : string
  status            : "pending" | "approved" | "rejected" | "ended"
  approved_by?      : string
  rejected_by?      : string
  original_nickname?: string
  created_at        : number
  guild_id?         : string
  channel_id?       : string
}

export async function check_expired_loa(client: Client): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000)
    
    const expired_loas = await db.find_many<loa_data>("loa_requests", {
      status  : "approved",
      end_date: { $lte: now },
    } as any)

    for (const loa of expired_loas) {
      try {
        if (!loa.guild_id || !discord_token) continue

        const guild  = client.guilds.cache.get(loa.guild_id)
        if (!guild) continue

        const member = await guild.members.fetch(loa.user_id).catch(() => null)
        if (!member) continue

        await member.roles.remove("1274580813912211477").catch(() => {})
        
        if (loa.original_nickname) {
          await member.setNickname(loa.original_nickname).catch(() => {})
        }

        const dm_message = component.build_message({
          components: [
            component.container({
              accent_color: component.from_hex("57F287"),
              components  : [
                component.text("## Leave of Absence Ended"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  "Your leave of absence has ended.",
                  `- Type: ${loa.type}`,
                  `- Duration: <t:${loa.start_date}:d> to <t:${loa.end_date}:d>`,
                ]),
                component.divider(2),
                component.text("Welcome back! Your role and nickname have been restored."),
              ],
            }),
          ],
        })

        await api.send_dm(loa.user_id, discord_token, dm_message).catch(() => {})

        await db.update_one("loa_requests", { id: loa.id }, { status: "ended" })
      } catch (err) {
        console.error(`[LOA] Failed to end LOA for ${loa.user_tag}:`, err)
      }
    }

    if (expired_loas.length > 0) {
      console.log(`[LOA] Ended ${expired_loas.length} expired LOA(s)`)
    }
  } catch (err) {
    console.error("[LOA] Failed to check expired LOAs:", err)
  }
}

export function start_loa_checker(client: Client): void {
  check_expired_loa(client)
  
  setInterval(() => {
    check_expired_loa(client)
  }, 60 * 60 * 1000)

  console.log("[LOA] Checker started (runs every hour)")
}
