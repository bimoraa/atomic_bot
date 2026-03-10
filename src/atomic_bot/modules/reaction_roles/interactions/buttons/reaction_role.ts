/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - 反应身份组按钮的交互注册 - \
// - registers the reaction role button interaction - \
// - 反应角色按钮处理器 - \
// - reaction role toggle button handler - \

import { ButtonInteraction, GuildMember } from "discord.js"
import { load_config }                    from "@shared/config/loader"
import { component }                      from "@shared/utils"
import { log_error }                      from "@shared/utils/error_logger"
import { member_has_role }                from "@shared/utils/discord_api"

const __role_config = load_config("reaction_roles") as Record<string, string>

const __role_map: Record<string, string> = {
  reaction_role_fishit           : __role_config.REACTION_ROLE_FISHIT || "",
  reaction_role_cdi              : __role_config.REACTION_ROLE_CDI || "",
  reaction_role_executor_update  : __role_config.REACTION_ROLE_EXECUTOR_UPDATE || "",
  reaction_role_roblox_update    : __role_config.REACTION_ROLE_ROBLOX_UPDATE || "",
  reaction_role_giveaway         : __role_config.REACTION_ROLE_GIVEAWAY || "",
}

const __role_names: Record<string, string> = {
  reaction_role_fishit           : "Fish It!",
  reaction_role_cdi              : "Car Driving Indonesia",
  reaction_role_executor_update  : "Executor Update",
  reaction_role_roblox_update    : "Roblox Update",
  reaction_role_giveaway         : "Giveaway Ping",
}

export async function handle_reaction_role(interaction: ButtonInteraction): Promise<void> {
  const member  = interaction.member as GuildMember
  const role_id = __role_map[interaction.customId]

  if (!role_id) {
    await interaction.reply({
      content  : "Invalid role configuration.",
      ephemeral: true,
    })
    return
  }

  const role      = await interaction.guild?.roles.fetch(role_id).catch(() => null)
  const role_name = __role_names[interaction.customId] || "Unknown Role"

  if (!role) {
    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({ components: [component.text("Role not found. Please contact an administrator.")] }),
        ],
      }),
      ephemeral: true,
    })
    return
  }

  try {
    const has_role = member_has_role(member, role_id)

    if (has_role) {
      await member.roles.remove(role_id)

      const message = component.build_message({
        components: [
          component.container({
            accent_color: 15548997,
            components: [
              component.text(`## Role Removed\nYou no longer have the **${role_name}** role.`),
            ],
          }),
        ],
      })

      await interaction.reply({ ...message, ephemeral: true })
    } else {
      await member.roles.add(role_id)

      const message = component.build_message({
        components: [
          component.container({
            accent_color: 5763719,
            components: [
              component.text(`## Role Added\nYou now have the **${role_name}** role.`),
            ],
          }),
        ],
      })

      await interaction.reply({ ...message, ephemeral: true })
    }
  } catch (error) {
    await log_error(interaction.client, error as Error, "Reaction Role Button", {
      user_id : interaction.user.id,
      guild_id: interaction.guildId || undefined,
    }).catch(() => {})
    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({ components: [component.text("Failed to update your roles. Please try again later.")] }),
        ],
      }),
      ephemeral: true,
    }).catch(() => {})
  }
}
