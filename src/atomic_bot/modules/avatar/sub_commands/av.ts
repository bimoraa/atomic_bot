/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - avatar 命令的子命令，查看头像的具体逻辑 - \
// - avatar sub-command handler, does the actual avatar lookup - \
import { Client, Message }               from "discord.js"
import { SubCommand }                  from "@shared/types/sub_command"
import { component, container_component } from "@shared/utils"
import { log_error }                   from "@shared/utils/error_logger"

const av_command: SubCommand = {
  name       : "av",
  description: "Display avatar of a user",

  /**
   * @description Show server/global avatar with toggle buttons (if both exist)
   * @param message - The Discord message
   * @param args    - Parsed arguments (unused, relies on mentions)
   * @param client  - Discord client instance
   * @returns Promise<void>
   */
  async execute(message: Message, args: string[], client: Client) {
    try {
      const mentioned   = message.mentions.users.first()
      const target_user = mentioned || message.author

      const global_avatar = target_user.displayAvatarURL({
        size     : 4096,
        extension: "png",
      })

      let server_avatar: string | null = null

      if (message.guild) {
        try {
          const member  = await message.guild.members.fetch(target_user.id)
          const raw_url = member.avatarURL({ size: 4096, extension: "png" })

          if (raw_url && raw_url !== global_avatar) {
            server_avatar = raw_url
          }
        } catch {}
      }

      // - DEFAULT: show server avatar when available - \\
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
