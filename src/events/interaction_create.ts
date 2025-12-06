import { Client, Collection, Interaction, ThreadChannel, GuildMember } from "discord.js";
import { Command } from "../types/command";
import { can_use_command } from "../functions/command_permissions";
import * as ticket_select from "../interactions/select_menus/ticket/select";
import * as ticket_create_modal from "../interactions/modals/ticket/create";
import * as ticket_close_modal from "../interactions/modals/ticket/close";
import * as devlog_modal from "../interactions/modals/devlog";
import * as review_modal from "../interactions/modals/review";
import * as purchase_close_reason_modal from "../interactions/modals/purchase_close_reason";
import * as edit_rules_modal from "../interactions/modals/edit_rules";
import * as ask_staff_modal from "../interactions/modals/ask_staff";
import * as join_ticket from "../interactions/buttons/ticket/join";
import * as close_ticket from "../interactions/buttons/ticket/close";
import * as review_submit from "../interactions/buttons/review/submit";
import * as purchase_open from "../interactions/buttons/purchase/open";
import * as purchase_close from "../interactions/buttons/purchase/close";
import * as purchase_close_reason from "../interactions/buttons/purchase/close_reason";
import * as purchase_claim from "../interactions/buttons/purchase/claim";
import * as purchase_join from "../interactions/buttons/purchase/join";
import * as purchase_add_member from "../interactions/buttons/purchase/add_member";
import * as ask_staff_button from "../interactions/buttons/ask/ask_staff";
import * as ask_answer from "../interactions/buttons/ask/answer";
import { handle_role_permission_select } from "../commands/tools/get_role_permission";

export async function handle_interaction(
  interaction: Interaction,
  client: Client & { commands: Collection<string, Command> }
) {
  if (interaction.isStringSelectMenu()) {
    try {
      if (interaction.customId === "role_permission_select") {
        await handle_role_permission_select(interaction, interaction.values[0]);
        return;
      }
      if (await ticket_select.handle(interaction)) return;
    } catch (err) {
      console.log("[select] Error:", err);
    }
  }

  if (interaction.isUserSelectMenu()) {
    try {
      if (interaction.customId.startsWith("purchase_add_member_select_")) {
        const thread_id = interaction.customId.replace("purchase_add_member_select_", "");
        const thread = interaction.channel as ThreadChannel;
        const member = interaction.member as GuildMember;
        const selected_users = interaction.values;
        const added_users: string[] = [];

        for (const user_id of selected_users) {
          try {
            await thread.members.add(user_id);
            added_users.push(`<@${user_id}>`);
          } catch {}
        }

        if (added_users.length > 0) {
          await thread.send({
            content: `${added_users.join(", ")} has been added to the ticket by <@${member.id}>.`,
          });

          await interaction.update({
            content: `Successfully added ${added_users.join(", ")} to the ticket.`,
            components: [],
          });
        } else {
          await interaction.update({
            content: "No members were added.",
            components: [],
          });
        }
        return;
      }
    } catch (err) {
      console.log("[user_select] Error:", err);
    }
  }

  if (interaction.isButton()) {
    try {
      if (await close_ticket.handle(interaction)) return;
      if (await join_ticket.handle(interaction)) return;
      if (interaction.customId === "review_submit") {
        await review_submit.handle_review_submit(interaction);
        return;
      }
      if (interaction.customId === "purchase_open") {
        await purchase_open.handle_purchase_open(interaction);
        return;
      }
      if (interaction.customId === "purchase_close") {
        await purchase_close.handle_purchase_close(interaction);
        return;
      }
      if (interaction.customId === "purchase_close_reason") {
        await purchase_close_reason.handle_purchase_close_reason(interaction);
        return;
      }
      if (interaction.customId === "purchase_claim") {
        await purchase_claim.handle_purchase_claim(interaction);
        return;
      }
      if (interaction.customId.startsWith("join_purchase_")) {
        await purchase_join.handle_join_purchase(interaction);
        return;
      }
      if (interaction.customId === "purchase_add_member") {
        await purchase_add_member.handle_purchase_add_member(interaction);
        return;
      }
      if (interaction.customId === "ask_staff_button") {
        await ask_staff_button.handle_ask_staff_button(interaction);
        return;
      }
      if (interaction.customId.startsWith("ask_answer_")) {
        await ask_answer.handle_ask_answer(interaction);
        return;
      }
    } catch (err) {
      console.log("[button] Error:", err);
    }
  }

  if (interaction.isModalSubmit()) {
    try {
      if (await ticket_create_modal.handle(interaction)) return;
      if (await ticket_close_modal.handle(interaction)) return;
      if (await devlog_modal.handle(interaction)) return;
      if (interaction.customId === "review_modal") {
        await review_modal.handle_review_modal(interaction);
        return;
      }
      if (interaction.customId === "purchase_close_reason_modal") {
        await purchase_close_reason_modal.handle_purchase_close_reason_modal(interaction);
        return;
      }
      if (interaction.customId.startsWith("edit_rules:")) {
        await edit_rules_modal.handle_edit_rules_modal(interaction);
        return;
      }
      if (interaction.customId === "ask_staff_modal") {
        await ask_staff_modal.handle_ask_staff_modal(interaction);
        return;
      }
    } catch (err) {
      console.log("[modal] Error:", err);
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const member = interaction.member as GuildMember;
  if (!can_use_command(member, interaction.commandName)) {
    await interaction.reply({
      content: "You don't have permission to use this command.",
      ephemeral: true,
    });
    return;
  }

  try {
    await command.execute(interaction);
  } catch {
    const content = "There was an error executing this command.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
}
