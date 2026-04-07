/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - ?av 子命令，通过名称/ID/提及查看用户头像 - \\
// - ?av sub-command, view avatar by name/id/mention - \\
import { Client, GuildMember, Message } from "discord.js"
import { SubCommand }                   from "@shared/types/sub_command"
import { component }                    from "@utils"
import { log_error }                    from "@utils/error_logger"

// - 提及正则，支持 <@id> 和 <@!id> - \\
// - mention regex, supports <@id> and <@!id> - \\
const __mention_regex = /^<@!?(\d+)>$/

/**
 * @description resolve a target member from args (mention, user id, or name search)
 * @param message - the discord message
 * @param args    - parsed command arguments
 * @returns {Promise<GuildMember | null>} resolved member or null (falls back to author)
 */
async function resolve_target(message: Message, args: string[]): Promise<GuildMember | null> {
  if (!message.guild) return null

  // - 没有参数时返回自己 - \\
  // - no args = show own avatar - \\
  if (args.length === 0) {
    return message.guild.members.fetch(message.author.id).catch(() => null)
  }

  const input = args.join(" ")

  // - 检查是否是提及 <@id> - \\
  // - check if input is a mention <@id> - \\
  const mention_match = input.match(__mention_regex)
  if (mention_match) {
    return message.guild.members.fetch(mention_match[1]).catch(() => null)
  }

  // - 检查是否是纯数字 (user id) - \\
  // - check if input is a raw user id - \\
  if (/^\d{17,20}$/.test(input)) {
    return message.guild.members.fetch(input).catch(() => null)
  }

  // - 按名称搜索 guild 成员 - \\
  // - search guild members by name - \\
  const search_results = await message.guild.members.fetch({ query: input, limit: 1 }).catch(() => null)

  if (search_results && search_results.size > 0) {
    return search_results.first() ?? null
  }

  return null
}

const av_command: SubCommand = {
  name       : "av",
  description: "Display avatar of a user",

  /**
   * @description show server/global avatar with toggle buttons (if both exist)
   * @param message - the discord message
   * @param args    - user identifier (mention, id, or name)
   * @param client  - discord client instance
   * @returns {Promise<void>}
   */
  async execute(message: Message, args: string[], client: Client) {
    try {
      const member = await resolve_target(message, args)

      if (!member) {
        const payload = component.build_message({
          components: [
            component.container({
              components: [
                component.text("User not found."),
              ],
              accent_color: component.from_hex("#FF0000"),
            }),
          ],
        })

        await message.reply(payload).catch(() => {})
        return
      }

      const target_user   = member.user
      const global_avatar = target_user.displayAvatarURL({ size: 4096, extension: "png" })
      const raw_server    = member.avatarURL({ size: 4096, extension: "png" })
      const server_avatar = raw_server && raw_server !== global_avatar ? raw_server : null

      // - 当服务器头像可用时优先显示 - \\
      // - default: show server avatar when available - \\
      const display_url = server_avatar ?? global_avatar

      const containers: component.container_component[] = [
        component.container({
          components: [
            component.text(`## <@${target_user.id}>'s Avatar\n`),
          ],
        }),
        component.container({
          components: [
            component.media_gallery([
              component.gallery_item(display_url),
            ]),
          ],
        }),
      ]

      if (server_avatar) {
        containers.push(
          component.container({
            components: [
              component.action_row(
                component.secondary_button("Server Avatar", `av_server_${target_user.id}`, undefined, true),
                component.secondary_button("Global Avatar", `av_global_${target_user.id}`),
              ),
            ],
          })
        )
      }

      const payload = component.build_message({ components: containers })

      await message.reply(payload).catch(() => {})
    } catch (error) {
      await log_error(client, error as Error, "Sub Command: ?av", {
        user   : message.author.tag,
        guild  : message.guild?.name || "DM",
        channel: message.channel.id,
      }).catch(() => {})
    }
  },
}

export default av_command
