import {
  ButtonInteraction,
  GuildMember,
  ThreadChannel,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} from "discord.js"
import { get_ticket } from "../state"
import { is_admin, is_staff } from "../../settings/permissions"

const __helper_role_id = "1357767950421065981"

export async function add_member(interaction: ButtonInteraction, ticket_type: string): Promise<void> {
  const thread    = interaction.channel as ThreadChannel
  const member    = interaction.member as GuildMember
  const data      = get_ticket(thread.id)
  const owner_id  = data?.owner_id
  const is_helper = member.roles.cache.has(__helper_role_id)

  if (ticket_type === "helper") {
    if (member.id !== owner_id && !is_admin(member) && !is_staff(member) && !is_helper) {
      await interaction.reply({ content: "Only the ticket owner, staff, or helpers can add members.", flags: 64 })
      return
    }
  } else {
    if (member.id !== owner_id && !is_admin(member)) {
      await interaction.reply({ content: "Only the ticket owner or staff can add members.", flags: 64 })
      return
    }
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
