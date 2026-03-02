// - 批准 LOA 按钮的交互注册 - \
// - registers the approve LOA button interaction - \
import { ButtonInteraction }              from "discord.js"
import { approve_loa, has_loa_permission } from "../../controller"
import { ButtonHandler }                   from "@shared/types/interaction"

export async function handle_loa_approve(interaction: ButtonInteraction): Promise<void> {
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
      content  : "You don't have permission to approve LOA requests",
      ephemeral: true,
    })
    return
  }

  const result = await approve_loa({
    message_id : interaction.message.id,
    approver_id: interaction.user.id,
    client     : interaction.client,
    guild_id   : interaction.guild.id,
  })

  if (!result.success) {
    await interaction.reply({
      content  : result.error || "Failed to approve LOA request",
      ephemeral: true,
    }).catch(() => {})
    return
  }

  await interaction.update(result.message!)
}

export const button: ButtonHandler = {
  custom_id: "loa_approve",
  execute: handle_loa_approve,
}
