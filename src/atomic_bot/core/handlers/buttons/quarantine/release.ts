/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 处理隔离申诉通过、释放用户的按钮 - \
// - handles the quarantine release button - \
import { ButtonInteraction, GuildMember } from "discord.js"
import { release_quarantine }             from "../../controllers/quarantine_controller"
import { component }                      from "@shared/utils"

/**
 * @description Handle early release from quarantine button
 * @param interaction - Button interaction
 */
export async function handle_quarantine_release(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content  : "This can only be used in a server",
      ephemeral: true,
    })
    return
  }

  const executor = interaction.member as GuildMember

  if (!executor.permissions.has("ModerateMembers")) {
    await interaction.reply({
      content  : "You don't have permission to release quarantined members",
      ephemeral: true,
    })
    return
  }

  const user_id = interaction.customId.split(":")[1]
  if (!user_id) {
    await interaction.reply({
      content  : "Invalid quarantine release request",
      ephemeral: true,
    })
    return
  }

  const result = await release_quarantine({
    client  : interaction.client,
    guild   : interaction.guild,
    user_id,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to release quarantine",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  const release_message = component.build_message({
    components: [
      component.container({
        accent_color: 0x57F287,
        components: [
          component.text("### Quarantine Released"),
          component.divider(),
          component.text([
            `- Member: <@${user_id}>`,
            `- Released by: <@${executor.id}>`,
            `- Status: Successfully released from quarantine`,
          ]),
        ],
      }),
    ],
  })

  await interaction.update(release_message)
}
