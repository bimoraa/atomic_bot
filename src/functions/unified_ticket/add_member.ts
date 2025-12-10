import {
  ButtonInteraction,
  GuildMember,
  ThreadChannel,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} from "discord.js"
import { get_ticket } from "./state"
import { is_admin } from "../permissions"

export async function add_member(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  const thread   = interaction.channel as ThreadChannel
  const member   = interaction.member as GuildMember
  const data     = get_ticket(thread.id)
  const owner_id = data?.owner_id

  if (member.id !== owner_id && !is_admin(member)) {
    await interaction.reply({ content: "Only the ticket owner or staff can add members.", flags: 64 })
    return
  }

  const select_menu = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`${ticket_type}_add_member_select_${thread.id}`)
      .setPlaceholder("Select a member to add")
      .setMinValues(1)
      .setMaxValues(5)
  )

  await interaction.reply({
    content:    "Select the member(s) you want to add to this ticket:",
    components: [select_menu],
    flags:      64,
  })
}
