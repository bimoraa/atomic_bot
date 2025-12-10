import {
  ButtonInteraction,
  ModalSubmitInteraction,
  UserSelectMenuInteraction,
  StringSelectMenuInteraction,
  ThreadChannel,
  GuildMember,
} from "discord.js"
import {
  ticket_types,
  get_ticket_config,
  has_required_role,
  issue_labels,
} from "./state"
import { open_ticket } from "./open"
import { close_ticket } from "./close"
import { claim_ticket } from "./claim"
import { join_ticket } from "./join"
import { reopen_ticket } from "./reopen"
import { add_member } from "./add_member"
import { modal } from "../../utils"

export async function handle_ticket_button(interaction: ButtonInteraction): Promise<boolean> {
  const custom_id = interaction.customId

  for (const [type_key, config] of Object.entries(ticket_types)) {
    const prefix = config.prefix

    if (custom_id === `${prefix}_open`) {
      if (type_key === "helper") {
        const helper_modal = modal.create_modal(
          `${prefix}_issue_modal`,
          "Helper/Supporter Ticket",
          modal.create_text_input({
            custom_id:   "helper_issue",
            label:       "What issue are you experiencing?",
            style:       "paragraph",
            placeholder: "Please describe your issue clearly so our Helper/Staff team can assist you...",
            required:    true,
            max_length:  1000,
          })
        )
        await interaction.showModal(helper_modal)
        return true
      }
      await interaction.deferReply({ flags: 64 })
      await open_ticket({ interaction, ticket_type: type_key })
      return true
    }

    if (custom_id === `${prefix}_close`) {
      await interaction.deferReply({ flags: 64 })
      const thread = interaction.channel as ThreadChannel
      if (!thread.isThread()) {
        await interaction.editReply({ content: "This can only be used in a ticket thread." })
        return true
      }
      await close_ticket({ thread, client: interaction.client, closed_by: interaction.user })
      await interaction.editReply({ content: "Ticket closed." })
      return true
    }

    if (custom_id === `${prefix}_close_reason`) {
      const close_modal = modal.create_modal(
        `${prefix}_close_reason_modal`,
        "Close Ticket",
        modal.create_text_input({
          custom_id:   "close_reason",
          label:       "Close Reason",
          style:       "paragraph",
          placeholder: "Enter the reason for closing this ticket...",
          required:    true,
          max_length:  500,
        })
      )
      await interaction.showModal(close_modal)
      return true
    }

    if (custom_id === `${prefix}_claim`) {
      await claim_ticket(interaction, type_key)
      return true
    }

    if (custom_id.startsWith(`${prefix}_join_`)) {
      const thread_id = custom_id.replace(`${prefix}_join_`, "")
      await join_ticket(interaction, type_key, thread_id)
      return true
    }

    if (custom_id === `${prefix}_reopen`) {
      await reopen_ticket(interaction, type_key)
      return true
    }

    if (custom_id === `${prefix}_add_member`) {
      await add_member(interaction, type_key)
      return true
    }
  }

  return false
}

export async function handle_ticket_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  const custom_id = interaction.customId

  for (const [type_key, config] of Object.entries(ticket_types)) {
    const prefix = config.prefix

    if (custom_id === `${prefix}_close_reason_modal`) {
      const thread       = interaction.channel as ThreadChannel
      const close_reason = interaction.fields.getTextInputValue("close_reason")

      await interaction.deferReply({ flags: 64 })

      if (!thread.isThread()) {
        await interaction.editReply({ content: "This can only be used in a ticket thread." })
        return true
      }

      await close_ticket({ thread, client: interaction.client, closed_by: interaction.user, reason: close_reason })
      await interaction.editReply({ content: "Ticket closed." })
      return true
    }

    if (custom_id === `${prefix}_issue_modal`) {
      const issue_description = interaction.fields.getTextInputValue("helper_issue")

      await interaction.deferReply({ ephemeral: true })
      await open_ticket({
        interaction: interaction as any,
        ticket_type: type_key,
        description: issue_description,
      })
      return true
    }

    if (custom_id.startsWith(`${prefix}_modal_`)) {
      const issue_type  = custom_id.replace(`${prefix}_modal_`, "")
      const issue_label = issue_labels[issue_type] || issue_type
      const description = interaction.fields.getTextInputValue("ticket_description")

      await interaction.deferReply({ ephemeral: true })
      await open_ticket({
        interaction: interaction as any,
        ticket_type: type_key,
        issue_type:  issue_label,
        description: description,
      })
      return true
    }
  }

  return false
}

export async function handle_ticket_select_menu(interaction: StringSelectMenuInteraction): Promise<boolean> {
  const custom_id = interaction.customId

  for (const [type_key, config] of Object.entries(ticket_types)) {
    const prefix = config.prefix

    if (custom_id === `${prefix}_select`) {
      const member = interaction.member as GuildMember

      if (config.require_role && !has_required_role(member, type_key)) {
        await interaction.reply({
          content:   `You need the <@&${config.required_role_id}> role to create a ticket.`,
          ephemeral: true,
        })
        return true
      }

      const issue_type = interaction.values[0]

      const ticket_modal = modal.create_modal(
        `${prefix}_modal_${issue_type}`,
        "Create Ticket",
        modal.create_text_input({
          custom_id:   "ticket_description",
          label:       "Describe your issue",
          style:       "paragraph",
          placeholder: "Please explain your issue in detail...",
          required:    true,
          max_length:  1000,
        })
      )

      await interaction.showModal(ticket_modal)
      return true
    }
  }

  return false
}

export async function handle_ticket_user_select(interaction: UserSelectMenuInteraction): Promise<boolean> {
  const custom_id = interaction.customId

  for (const [type_key, config] of Object.entries(ticket_types)) {
    const prefix = config.prefix

    if (custom_id.startsWith(`${prefix}_add_member_select_`)) {
      const thread_id      = custom_id.replace(`${prefix}_add_member_select_`, "")
      const thread         = interaction.channel as ThreadChannel
      const member         = interaction.member as GuildMember
      const selected_users = interaction.values
      const added_users: string[] = []

      for (const user_id of selected_users) {
        try {
          await thread.members.add(user_id)
          added_users.push(`<@${user_id}>`)
        } catch {}
      }

      if (added_users.length > 0) {
        await thread.send({
          content: `${added_users.join(", ")} has been added to the ticket by <@${member.id}>.`,
        })

        await interaction.update({
          content:    `Successfully added ${added_users.join(", ")} to the ticket.`,
          components: [],
        })
      } else {
        await interaction.update({
          content:    "No members were added.",
          components: [],
        })
      }
      return true
    }
  }

  return false
}
