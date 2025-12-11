import { Client, Collection, Interaction, ThreadChannel, GuildMember } from "discord.js";
import { Command } from "../types/command";
import { can_use_command } from "../functions/command_permissions";
import {
  handle_ticket_button,
  handle_ticket_modal,
  handle_ticket_select_menu,
  handle_ticket_user_select,
} from "../functions/unified_ticket";
import * as answer_stats_select from "../interactions/select_menus/answer_stats";
import * as devlog_modal        from "../interactions/modals/devlog";
import * as review_modal        from "../interactions/modals/review";
import * as edit_rules_modal    from "../interactions/modals/edit_rules";
import * as ask_staff_modal     from "../interactions/modals/ask_staff";
import * as review_submit       from "../interactions/buttons/review/submit";
import * as ask_staff_button    from "../interactions/buttons/ask/ask_staff";
import * as ask_answer          from "../interactions/buttons/ask/answer";
import * as close_request_handlers from "../interactions/buttons/close_request/handlers";
import * as reaction_role       from "../interactions/buttons/reaction/role";
import * as payment_handlers    from "../interactions/buttons/payment/handlers";
import * as guide_example       from "../interactions/buttons/guide/example";
import { handle_role_permission_select } from "../commands/tools/get_role_permission";

import * as payment_method_select from "../interactions/select_menus/payment_method";
import * as guide_select          from "../interactions/select_menus/guide_select";
import * as version_select        from "../interactions/select_menus/version/select";

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
      if (interaction.customId === "answer_stats_select") {
        await answer_stats_select.handle_answer_stats_select(interaction);
        return;
      }
      if (interaction.customId === "payment_method_select") {
        await payment_method_select.handle_payment_method_select(interaction);
        return;
      }
      if (interaction.customId === "guide_select") {
        await guide_select.handle_guide_select(interaction);
        return;
      }
      if (interaction.customId.startsWith("guide_lang_")) {
        await guide_select.handle_guide_language_select(interaction);
        return;
      }
      if (interaction.customId === "version_platform_select") {
        await version_select.handle_version_platform_select(interaction);
        return;
      }
      if (await handle_ticket_select_menu(interaction)) return;
    } catch (err) {
      console.log("[select] Error:", err);
    }
  }

  if (interaction.isUserSelectMenu()) {
    try {
      if (await handle_ticket_user_select(interaction)) return;
    } catch (err) {
      console.log("[user_select] Error:", err);
    }
  }

  if (interaction.isButton()) {
    try {
      if (await handle_ticket_button(interaction)) return;
      if (interaction.customId === "review_submit") {
        await review_submit.handle_review_submit(interaction);
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
      if (interaction.customId === "close_request_accept") {
        await close_request_handlers.handle_close_request_accept(interaction);
        return;
      }
      if (interaction.customId === "close_request_deny") {
        await close_request_handlers.handle_close_request_deny(interaction);
        return;
      }
      if (interaction.customId.startsWith("reaction_role_")) {
        await reaction_role.handle_reaction_role(interaction);
        return;
      }
      if (interaction.customId.startsWith("payment_approve_")) {
        await payment_handlers.handle_payment_approve(interaction);
        return;
      }
      if (interaction.customId.startsWith("payment_reject_")) {
        await payment_handlers.handle_payment_reject(interaction);
        return;
      }
      if (interaction.customId.startsWith("guide_btn_")) {
        await guide_example.handle_guide_button(interaction);
        return;
      }
    } catch (err) {
      console.log("[button] Error:", err);
    }
  }

  if (interaction.isModalSubmit()) {
    try {
      if (await handle_ticket_modal(interaction)) return;
      if (await devlog_modal.handle(interaction)) return;
      if (interaction.customId === "review_modal") {
        await review_modal.handle_review_modal(interaction);
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
