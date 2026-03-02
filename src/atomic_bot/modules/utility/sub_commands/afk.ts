// - AFK 子命令处理，检测提及 AFK 用户 - \
// - AFK sub-command handler, detects when AFK users are mentioned - \
import { Client, Message }                     from "discord.js"
import { SubCommand }                        from "@shared/types/sub_command"
import { set_afk, is_ignored_channel }       from "../../../infrastructure/cache/afk"
import { component }                         from "@shared/utils"
import { sanitize_afk_reason }               from "../commands/afk_utils"

const afk_command: SubCommand = {
  name       : "afk",
  description: "Set your AFK status",

  async execute(message: Message, args: string[], client: Client) {
    if (message.guild && is_ignored_channel(message.guild.id, message.channel.id)) {
      const ignored_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text("AFK set is disabled in this channel."),
            ],
          }),
        ],
      })

      await message.reply(ignored_message).catch(() => {})
      return
    }

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
