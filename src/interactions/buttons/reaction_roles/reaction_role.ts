import { ButtonInteraction, GuildMember } from "discord.js"
import { load_config } from "../../../configuration/loader"
import { component } from "../../../utils"

const ROLE_CONFIG = load_config("reaction_roles") as Record<string, string>

const ROLE_MAP: Record<string, string> = {
  reaction_role_fishit           : ROLE_CONFIG.REACTION_ROLE_FISHIT || "",
  reaction_role_cdi              : ROLE_CONFIG.REACTION_ROLE_CDI || "",
  reaction_role_executor_update  : ROLE_CONFIG.REACTION_ROLE_EXECUTOR_UPDATE || "",
  reaction_role_roblox_update    : ROLE_CONFIG.REACTION_ROLE_ROBLOX_UPDATE || "",
  reaction_role_giveaway         : ROLE_CONFIG.REACTION_ROLE_GIVEAWAY || "",
}

const ROLE_NAMES: Record<string, string> = {
  reaction_role_fishit           : "Fish It!",
  reaction_role_cdi              : "Car Driving Indonesia",
  reaction_role_executor_update  : "Executor Update",
  reaction_role_roblox_update    : "Roblox Update",
  reaction_role_giveaway         : "Giveaway Ping",
}

export async function handle_reaction_role(interaction: ButtonInteraction): Promise<void> {
  const member  = interaction.member as GuildMember
  const role_id = ROLE_MAP[interaction.customId]

  if (!role_id) {
    await interaction.reply({
      content  : "Invalid role configuration.",
      ephemeral: true,
    })
    return
  }

  const role      = interaction.guild?.roles.cache.get(role_id)
  const role_name = ROLE_NAMES[interaction.customId] || "Unknown Role"

  if (!role) {
    await interaction.reply({
      content  : `Role not found. Please contact an administrator.`,
      ephemeral: true,
    })
    return
  }

  try {
    const has_role = member.roles.cache.has(role_id)

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
    await interaction.reply({
      content  : "Failed to update your roles. Please try again later.",
      ephemeral: true,
    })
  }
}
