import { ButtonInteraction, GuildMember } from "discord.js"
import { api } from "../../../utils"

export async function handle_reaction_role(interaction: ButtonInteraction) {
  const role_id = interaction.customId.replace("reaction_role_", "")
  const member = interaction.member as GuildMember
  const guild = interaction.guild!

  await interaction.deferReply({ flags: 64 })

  const role = guild.roles.cache.get(role_id)
  if (!role) {
    await interaction.editReply({ content: "Role not found." })
    return
  }

  const bot_member = guild.members.me
  if (!bot_member) {
    await interaction.editReply({ content: "Bot member not found." })
    return
  }

  if (role.position >= bot_member.roles.highest.position) {
    await interaction.editReply({ 
      content: `Cannot manage **${role.name}** role. Please move the bot's role higher in the role hierarchy.`
    })
    return
  }

  const has_role = member.roles.cache.has(role_id)

  try {
    if (has_role) {
      await member.roles.remove(role_id)
      
      const removed_message = {
        flags: 32768 | 64,
        components: [
          {
            type: 17,
            components: [
              {
                type: 10,
                content: `## Role Removed\nYou no longer have the **${role.name}** role.`,
              },
            ],
          },
        ],
      }

      await api.send_components_v2_followup(interaction, removed_message as any)
    } else {
      await member.roles.add(role_id)
      
      const added_message = {
        flags: 32768 | 64,
        components: [
          {
            type: 17,
            components: [
              {
                type: 10,
                content: `## Role Added\nYou now have the **${role.name}** role.`,
              },
            ],
          },
        ],
      }

      await api.send_components_v2_followup(interaction, added_message as any)
    }
  } catch (err: any) {
    console.error("[reaction_role] Error:", err.message)
    await interaction.editReply({ 
      content: `Failed to update role. Make sure the bot has permission to manage roles.`
    })
  }
}
