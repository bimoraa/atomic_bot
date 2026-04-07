/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - anti-nuke undo button handler - \\
import { ButtonInteraction } from "discord.js"
import { component }         from "@utils"
import { log_error }         from "@utils/error_logger"
import { undo_quarantine }   from "@commands/moderation/anti-nuke/controller/anti_nuke.controller"

/**
 * @description handle anti_nuke_undo button — reverts a quarantine action
 * @param interaction - Discord ButtonInteraction
 * @returns Promise<void>
 */
export async function handle_anti_nuke_undo(interaction: ButtonInteraction): Promise<void> {
  const [, incident_id, guild_id] = interaction.customId.split(":")

  if (!incident_id || !guild_id) {
    await interaction.reply({
      ...component.build_message({
        components: [component.container({
          accent_color: 0xED4245,
          components  : [component.text("Invalid undo button data.")],
        })],
      }),
      ephemeral: true,
    }).catch(() => {})
    return
  }

  if (!interaction.guild) return

  try {
    await interaction.deferReply({ ephemeral: true })

    const result = await undo_quarantine(
      interaction.client,
      interaction.guild,
      incident_id,
      interaction.user.id,
    )

    if (!result.success) {
      await interaction.editReply({
        ...component.build_message({
          components: [component.container({
            accent_color: 0xED4245,
            components  : [component.text(`### Undo Failed\n${result.error ?? "Unknown error."}`)],
          })],
        }),
      })
      return
    }

    await interaction.editReply({
      ...component.build_message({
        components: [component.container({
          accent_color: 0x57F287,
          components  : [component.text([
            "### Undo Successful",
            `Quarantine for incident \`${incident_id.slice(0, 8)}\` has been reverted.`,
            `Roles restored, timeout removed.`,
            `Reverted by <@${interaction.user.id}>.`,
          ])],
        })],
      }),
    })
  } catch (err) {
    await log_error(interaction.client, err as Error, "Anti-Nuke Undo Button", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId ?? "",
    }).catch(() => {})

    await interaction.editReply({
      ...component.build_message({
        components: [component.container({
          accent_color: 0xED4245,
          components  : [component.text("An error occurred while processing the undo.")],
        })],
      }),
    }).catch(() => {})
  }
}
