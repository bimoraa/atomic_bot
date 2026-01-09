import { StringSelectMenuInteraction, GuildMember } from "discord.js"
import { api } from "../../../shared/utils"
import { get_staff_stats, build_stats_panel } from "../../../modules/staff/staff/get_answer_stats"

export async function handle_answer_stats_select(interaction: StringSelectMenuInteraction): Promise<void> {
  await interaction.deferUpdate()

  const staff_id = interaction.values[0]
  if (!staff_id) return

  const guild = interaction.guild
  if (!guild) return

  const member = await guild.members.fetch(staff_id).catch(() => null)
  if (!member) {
    await interaction.followUp({ content: "Staff member not found.", ephemeral: true })
    return
  }

  const stats   = await get_staff_stats(staff_id)
  const message = build_stats_panel(
    staff_id,
    member.displayName,
    member.displayAvatarURL({ extension: "png", size: 128 }),
    stats
  )

  await api.edit_interaction_response(
    interaction.client.user.id,
    interaction.token,
    message
  )
}
