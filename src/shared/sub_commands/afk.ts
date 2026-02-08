import { Message, Client }                   from "discord.js"
import { SubCommand }                        from "../types/sub_command"
import { set_afk }                           from "../../infrastructure/cache/afk"
import { component }                         from "../utils"
import { sanitize_afk_reason }               from "../../modules/utility/afk/afk_utils"

const afk_command: SubCommand = {
  name       : "afk",
  description: "Set your AFK status",

  async execute(message: Message, args: string[], client: Client) {
    const raw_reason = args.join(" ").trim() || "AFK"
    const reason     = sanitize_afk_reason(raw_reason)
    const member     = message.guild?.members.cache.get(message.author.id)

    if (member) {
      const original_nickname = member.nickname
      const display_name      = member.displayName

      set_afk(message.author.id, reason, original_nickname)

      try {
        if (!display_name.startsWith("[AFK]")) {
          await member.setNickname(`[AFK] - ${display_name}`)
        }
      } catch {}
    } else {
      set_afk(message.author.id, reason, null)
    }

    const afk_confirmation = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`<@${message.author.id}> I set your AFK: ${reason}`),
          ],
        }),
      ],
    })

    await message.reply(afk_confirmation).catch(() => {})
  },
}

export default afk_command
