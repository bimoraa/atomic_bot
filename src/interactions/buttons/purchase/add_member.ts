import {
  ButtonInteraction,
  GuildMember,
  ThreadChannel,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} from "discord.js"
import { purchase_owners } from "../../shared/ticket_state"
import { is_admin } from "../../../functions/permissions"

export async function handle_purchase_add_member(interaction: ButtonInteraction) {
  const thread = interaction.channel as ThreadChannel
  const member = interaction.member as GuildMember
  const owner_id = purchase_owners.get(thread.id)

  if (member.id !== owner_id && !is_admin(member)) {
    await interaction.reply({
      content: "Only the ticket owner or staff can add members.",
      flags: 64,
    })
    return
  }

  const select_menu = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`purchase_add_member_select_${thread.id}`)
      .setPlaceholder("Select a member to add")
      .setMinValues(1)
      .setMaxValues(5)
  )

  await interaction.reply({
    content: "Select the member(s) you want to add to this ticket:",
    components: [select_menu],
    flags: 64,
  })
}
