import { ButtonInteraction }       from "discord.js"
import { end_loa, has_loa_permission } from "../../controllers/loa_controller"

export async function handle_loa_end(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.member) {
    await interaction.reply({
      content  : "This can only be used in a server",
      ephemeral: true,
    })
    return
  }

  const member_roles = interaction.member.roles as any
  if (!has_loa_permission(member_roles)) {
    await interaction.reply({
      content  : "You don't have permission to end LOA requests",
      ephemeral: true,
    })
    return
  }

  const result = await end_loa({
    message_id: interaction.message.id,
    ender_id  : interaction.user.id,
    client    : interaction.client,
    guild_id  : interaction.guild.id,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to end LOA request",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  if (result.message_deleted) {
    await interaction.reply({
      content  : "LOA has been ended and the message has been deleted",
      ephemeral: true,
    }).catch(() => {})
  }
}
