import { Client, Message } from "discord.js"
import { component }        from "../utils"
import * as fs              from "fs"
import * as path            from "path"

interface AutoReplyConfig {
  keywords             : string[]
  response             : string
  navigate_to          : string
  navigate_button_text : string
}

const channel_cooldowns = new Map<string, number>()
const COOLDOWN_MS = 15000

function load_auto_reply_configs(): AutoReplyConfig[] {
  try {
    const auto_reply_dir = path.join(process.cwd(), "guide", "auto_reply")
    if (!fs.existsSync(auto_reply_dir)) return []

    const files   = fs.readdirSync(auto_reply_dir).filter(f => f.endsWith(".cfg"))
    const configs: AutoReplyConfig[] = []

    for (const file of files) {
      try {
        const config_path = path.join(auto_reply_dir, file)
        const content     = fs.readFileSync(config_path, "utf-8")
        const config      = JSON.parse(content) as AutoReplyConfig

        if (config.keywords?.length > 0 && config.response && config.navigate_to) {
          config.keywords = config.keywords.map(k => k.toLowerCase())
          configs.push(config)
        }
      } catch {
        continue
      }
    }

    return configs
  } catch {
    return []
  }
}

export async function handle_auto_reply(message: Message, client: Client): Promise<boolean> {
  if (message.author.bot) return false
  if (!message.guild) return false

  const now         = Date.now()
  const channel_id  = message.channel.id
  const last_reply  = channel_cooldowns.get(channel_id)

  if (last_reply && now - last_reply < COOLDOWN_MS) {
    return false
  }

  const configs       = load_auto_reply_configs()
  if (configs.length === 0) return false

  const content_lower = message.content.toLowerCase()

  for (const config of configs) {
    const matched = config.keywords.some(keyword => content_lower.includes(keyword))
    if (!matched) continue

    const guide_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(config.response),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.link_button(
                config.navigate_button_text,
                `https://discord.com/channels/${message.guild.id}/${config.navigate_to}`
              )
            )
          ],
        }),
      ],
    })

    await message.reply(guide_message)
    channel_cooldowns.set(channel_id, now)
    return true
  }

  return false
}
