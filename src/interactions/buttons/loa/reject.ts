import { ButtonInteraction }         from "discord.js"
import { reject_loa, has_loa_permission } from "../../controller/loa_controller"

export async function handle_loa_reject(interaction: ButtonInteraction): Promise<void> {
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
      content  : "You don't have permission to reject LOA requests",
      ephemeral: true,
    })
    return
  }

  const result = await reject_loa({
    message_id : interaction.message.id,
    rejector_id: interaction.user.id,
    client     : interaction.client,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to reject LOA request",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.update(result.message!)
}
