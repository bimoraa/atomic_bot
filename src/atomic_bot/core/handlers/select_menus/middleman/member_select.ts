import { UserSelectMenuInteraction, ThreadChannel } from "discord.js"

/**
 * @description Handles member selection to add to middleman ticket
 * @param {UserSelectMenuInteraction} interaction - The user select interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_member_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_member_select:")) return false

  await interaction.deferReply({ ephemeral: true })

  const thread    = interaction.channel as ThreadChannel
  const member_id = interaction.values[0]

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return true
  }

  try {
    await thread.members.add(member_id)
    await interaction.editReply({ content: `Successfully added <@${member_id}> to the ticket.` })
  } catch (error) {
    console.error("[ - MIDDLEMAN ADD MEMBER - ] Error:", error)
    await interaction.editReply({ content: "Failed to add member to ticket. Please try again." })
  }

  return true
}
