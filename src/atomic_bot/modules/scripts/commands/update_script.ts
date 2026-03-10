/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /push-script 斜杠命令，上传本地脚本到 Luarmor - \
// - /push-script slash command, uploads local script file to Luarmor API - \
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                       from "@shared/types/command"
import { log_error }                     from "@shared/utils/error_logger"
import { build_update_script_message }   from "../controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("push-script")
    .setDescription("Push a local script file to Luarmor")
    .addAttachmentOption((option) =>
      option
        .setName("file")
        .setDescription("The script file to upload")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (interaction.user.id !== "1118453649727823974") {
      await interaction.reply({ content: "You are not allowed to use this command.", ephemeral: true })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    try {
      const attachment = interaction.options.getAttachment("file", true)
      const message    = await build_update_script_message(attachment.url, attachment.name)

      await interaction.editReply(message as any)
    } catch (err) {
      await log_error(interaction.client, err as Error, "Update Script Command", {
        user_id  : interaction.user.id,
        guild_id : interaction.guildId ?? undefined,
      }).catch(() => {})
      await interaction.editReply({ content: "Failed to load script data. Please try again." })
    }
  },
}
