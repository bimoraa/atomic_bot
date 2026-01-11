import { Client, Collection, Interaction, ThreadChannel, GuildMember, ButtonInteraction } from "discord.js"
import { Command }                                                     from "../../shared/types/command"
import { can_use_command }                                             from "../../shared/database/settings/command_permissions"
import { log_error, handle_error_log_button }                          from "../../shared/utils/error_logger"
import {
  handle_ticket_button,
  handle_ticket_modal,
  handle_ticket_select_menu,
  handle_ticket_user_select,
}                                        from "../../shared/database/unified_ticket"
import * as answer_stats_select          from "./select_menus/stats"
import {
  handle_devlog,
  handle_ask_staff_modal,
  handle_loa_request_modal,
  handle_edit_rules_modal,
}                                        from "./modals/staff"
import { handle_reminder_add_new_modal } from "./modals/tools"
import { handle_script_redeem_modal }    from "./modals/service"
import { handle_tempvoice_modal }        from "./modals/voice"
import { handle_review_modal }           from "./modals/community"
import { handle_music_modal }            from "./modals/music"
import { handle_middleman_close_reason_modal } from "./modals/ticket"
import * as review_submit                from "./buttons/review/submit"
import * as ask_staff_button             from "./buttons/ask/ask_staff"
import * as ask_answer                   from "./buttons/ask/answer"
import * as close_request_handlers       from "./buttons/close_request/handlers"
import * as reaction_role                from "./buttons/reaction_roles/reaction_role"
import * as payment_handlers             from "./buttons/payment/handlers"
import * as guide_example                from "./buttons/guide/example"
import * as script_redeem_key            from "./buttons/script/redeem_key"
import * as script_get_script            from "./buttons/script/get_script"
import * as script_get_role              from "./buttons/script/get_role"
import * as script_reset_hwid            from "./buttons/script/reset_hwid"
import * as script_get_stats             from "./buttons/script/get_stats"
import * as script_view_leaderboard      from "./buttons/script/view_leaderboard"
import * as free_get_script              from "./buttons/free/get_script"
import * as free_reset_hwid              from "./buttons/free/reset_hwid"
import * as free_get_stats               from "./buttons/free/get_stats"
import * as free_leaderboard             from "./buttons/free/leaderboard"
import * as bypass_mobile_copy           from "./buttons/bypass/mobile_copy"
import * as download_all_staff_report    from "./buttons/work/download_all_staff_report"
import * as tempvoice_handlers           from "./buttons/tempvoice/handlers"
import * as tempvoice_user_select        from "./select_menus/tempvoice/user_select"
import * as tempvoice_region_select      from "./select_menus/tempvoice/region_select"
import { handle_role_permission_select } from "../../modules/utility/utility/get_role_permission"
import * as reminder_add_new             from "./buttons/reminder/add_new"
import * as reminder_list                from "./buttons/reminder/list"
import * as reminder_cancel              from "./buttons/reminder/cancel"
import * as loa_request                  from "./buttons/loa/request"
import * as booster_claim                from "./buttons/booster/claim"
import * as loa_approve                  from "./buttons/loa/approve"
import * as loa_reject                   from "./buttons/loa/reject"
import * as loa_end                      from "./buttons/loa/end"
import * as music_pause                  from "./buttons/music/pause"
import * as music_resume                 from "./buttons/music/resume"
import * as music_skip                   from "./buttons/music/skip"
import * as music_stop                   from "./buttons/music/stop"
import * as music_select                 from "./select_menus/music/music_select"
import * as music_play_select            from "./select_menus/music/play_select"

import * as payment_method_select        from "./select_menus/stats";
import * as guide_select                 from "./select_menus/guide";
import * as version_select               from "./select_menus/version/select";
import * as work_stats_select            from "./select_menus/work_stats/week_select";
import * as work_stats_year_select       from "./select_menus/work_stats/year_select";
import * as work_stats_all_staff         from "./select_menus/work_stats/all_staff_week_select"
import * as reminder_cancel_select       from "./select_menus/reminder"
import * as middleman_select             from "./select_menus/middleman"
import * as middleman_buttons            from "./buttons/middleman"
import * as bypass_support_type_select   from "./select_menus/bypass"


async function handle_anti_spam_button(interaction: ButtonInteraction, client: Client): Promise<void> {
  try {
    const parts       = interaction.customId.split(":")
    const action      = parts[0]
    const target_id   = parts[1]
    const message_id  = parts[2]

    if (!target_id) {
      await interaction.reply({ content: "Target not found", ephemeral: true })
      return
    }

    const guild = interaction.guild
    if (!guild) {
      await interaction.reply({ content: "Guild not found", ephemeral: true })
      return
    }

    if (action === "anti_spam_untimeout") {
      const member = await guild.members.fetch(target_id).catch(() => null)
      if (!member) {
        await interaction.reply({ content: "User not found in guild", ephemeral: true })
        return
      }
      await member.timeout(null, "Anti-Spam untimeout")
      await interaction.reply({ content: "User un-timed out", ephemeral: true })
      return
    }

    if (action === "anti_spam_ban") {
      const member = await guild.members.fetch(target_id).catch(() => null)
      if (member) {
        await member.ban({ reason: "Anti-Spam ban" })
      } else {
        await guild.bans.create(target_id, { reason: "Anti-Spam ban" }).catch(async () => {
          await interaction.reply({ content: "Failed to ban user", ephemeral: true })
        })
      }
      if (!interaction.replied) await interaction.reply({ content: "User banned", ephemeral: true })
      return
    }

    if (action === "anti_spam_download") {
      await interaction.reply({
        content  : `Target: <@${target_id}>\nMessage ID: ${message_id || "N/A"}`,
        ephemeral: true,
      })
      return
    }

    await interaction.reply({ content: "Unknown action", ephemeral: true })
  } catch (err) {
    console.log("[anti_spam_button] Error:", err)
    await log_error(client, err as Error, "Anti-Spam Button", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      guild    : interaction.guild?.name || "DM",
      channel  : interaction.channel?.id,
    })
    if (!interaction.replied) {
      await interaction.reply({ content: "Error handling action", ephemeral: true }).catch(() => {})
    }
  }
}

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
      if (interaction.customId === "work_stats_week_select") {
        await work_stats_select.handle_work_stats_week_select(interaction);
        return;
      }
      if (interaction.customId === "all_staff_work_year_select") {
        await work_stats_year_select.handle_all_staff_work_year_select(interaction);
        return;
      }
      if (interaction.customId === "all_staff_work_week_select") {
        await work_stats_all_staff.handle_all_staff_work_week_select(interaction);
        return;
      }
      if (interaction.customId === "reminder_cancel_select") {
        await reminder_cancel_select.handle_reminder_cancel_select(interaction);
        return;
      }
      if (interaction.customId === "music_select") {
        await music_select.handle_music_select(interaction);
        return;
      }
      if (interaction.customId.startsWith("music_play_select:")) {
        await music_play_select.handle_music_play_select(interaction)
        return
      }
      if (interaction.customId === "middleman_transaction_range_select") {
        await middleman_select.handle_middleman_transaction_range_select(interaction)
        return
      }
      if (interaction.customId.startsWith("bypass_support_type_select:")) {
        await bypass_support_type_select.handle_bypass_support_type_select(interaction)
        return
      }
      if (await tempvoice_region_select.handle_tempvoice_region_select(interaction)) return
      if (await handle_ticket_select_menu(interaction)) return
    } catch (err) {
      console.log("[select] Error:", err);
      await log_error(client, err as Error, "StringSelectMenu", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      });
    }
  }

  if (interaction.isUserSelectMenu()) {
    try {
      if (await handle_ticket_user_select(interaction)) return
      if (await middleman_select.handle_middleman_partner_select(interaction)) return
      if (await middleman_select.handle_middleman_member_select(interaction)) return
      if (await tempvoice_user_select.handle_tempvoice_user_select(interaction)) return
    } catch (err) {
      console.log("[user_select] Error:", err);
      await log_error(client, err as Error, "UserSelectMenu", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      });
    }
  }

  if (interaction.isButton()) {
    try {
      if (await handle_error_log_button(interaction, client)) return
      if (interaction.customId.startsWith("anti_spam_")) {
        await handle_anti_spam_button(interaction, client)
        return
      }
      if (await handle_ticket_button(interaction)) return
      if (await middleman_buttons.handle_middleman_close(interaction)) return
      if (await middleman_buttons.handle_middleman_close_reason(interaction)) return
      if (await middleman_buttons.handle_middleman_add_member(interaction)) return
      if (await middleman_buttons.handle_middleman_complete(interaction)) return
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
      }      if (interaction.customId.startsWith("download_all_staff_report:")) {
        await download_all_staff_report.handle_download_all_staff_report(interaction)
        return
      }      if (interaction.customId === "script_redeem_key") {
        await script_redeem_key.handle_redeem_key(interaction);
        return;
      }
      if (interaction.customId === "script_get_script") {
        await script_get_script.handle_get_script(interaction);
        return;
      }
      if (interaction.customId === "script_get_role") {
        await script_get_role.handle_get_role(interaction);
        return;
      }
      if (interaction.customId === "script_reset_hwid") {
        await script_reset_hwid.handle_reset_hwid(interaction);
        return;
      }
      if (interaction.customId === "script_get_stats") {
        await script_get_stats.handle_get_stats(interaction);
        return;
      }
      if (interaction.customId === "script_view_leaderboard") {
        await script_view_leaderboard.handle_view_leaderboard(interaction);
        return;
      }
      if (interaction.customId === "script_mobile_copy") {
        await script_get_script.handle_mobile_copy(interaction)
        return
      }
      if (interaction.customId.startsWith("bypass_mobile_copy:")) {
        await bypass_mobile_copy.handle_bypass_mobile_copy(interaction)
        return
      }
      if (interaction.customId === "free_get_script") {
        await free_get_script.handle_free_get_script(interaction)
        return
      }
      if (interaction.customId === "free_mobile_copy") {
        await free_get_script.handle_free_mobile_copy(interaction)
        return
      }
      if (interaction.customId === "free_reset_hwid") {
        await free_reset_hwid.handle_free_reset_hwid(interaction)
        return
      }
      if (interaction.customId === "free_get_stats") {
        await free_get_stats.handle_free_get_stats(interaction)
        return
      }
      if (interaction.customId === "free_leaderboard") {
        await free_leaderboard.handle_free_leaderboard(interaction)
        return
      }
      if (interaction.customId === "tempvoice_name") {
        await tempvoice_handlers.handle_tempvoice_name(interaction)
        return
      }
      if (interaction.customId === "tempvoice_limit") {
        await tempvoice_handlers.handle_tempvoice_limit(interaction)
        return
      }
      if (interaction.customId === "tempvoice_privacy") {
        await tempvoice_handlers.handle_tempvoice_privacy(interaction)
        return
      }
      if (interaction.customId === "tempvoice_waitingroom") {
        await tempvoice_handlers.handle_tempvoice_waitingroom(interaction)
        return
      }
      if (interaction.customId === "tempvoice_chat") {
        await tempvoice_handlers.handle_tempvoice_chat(interaction)
        return
      }
      if (interaction.customId === "tempvoice_trust") {
        await tempvoice_handlers.handle_tempvoice_trust(interaction)
        return
      }
      if (interaction.customId === "tempvoice_untrust") {
        await tempvoice_handlers.handle_tempvoice_untrust(interaction)
        return
      }
      if (interaction.customId === "tempvoice_invite") {
        await tempvoice_handlers.handle_tempvoice_invite(interaction)
        return
      }
      if (interaction.customId === "tempvoice_kick") {
        await tempvoice_handlers.handle_tempvoice_kick(interaction)
        return
      }
      if (interaction.customId === "tempvoice_region") {
        await tempvoice_handlers.handle_tempvoice_region(interaction)
        return
      }
      if (interaction.customId === "tempvoice_block") {
        await tempvoice_handlers.handle_tempvoice_block(interaction)
        return
      }
      if (interaction.customId === "tempvoice_unblock") {
        await tempvoice_handlers.handle_tempvoice_unblock(interaction)
        return
      }
      if (interaction.customId === "tempvoice_claim") {
        await tempvoice_handlers.handle_tempvoice_claim(interaction)
        return
      }
      if (interaction.customId === "tempvoice_transfer") {
        await tempvoice_handlers.handle_tempvoice_transfer(interaction)
        return
      }
      if (interaction.customId === "tempvoice_delete") {
        await tempvoice_handlers.handle_tempvoice_delete(interaction)
        return
      }
      if (interaction.customId === "tempvoice_leaderboard") {
        await tempvoice_handlers.handle_tempvoice_leaderboard(interaction)
        return
      }
      if (interaction.customId === "reminder_add_new") {
        await reminder_add_new.handle_reminder_add_new(interaction)
        return
      }
      if (interaction.customId === "reminder_list") {
        await reminder_list.handle_reminder_list(interaction)
        return
      }
      if (interaction.customId === "reminder_cancel_select") {
        await reminder_cancel.handle_reminder_cancel(interaction)
        return
      }
      if (interaction.customId === "loa_request") {
        await loa_request.handle_loa_request(interaction)
        return
      }
      if (interaction.customId === "loa_approve") {
        await loa_approve.handle_loa_approve(interaction)
        return
      }
      if (interaction.customId === "loa_reject") {
        await loa_reject.handle_loa_reject(interaction)
        return
      }
      if (interaction.customId === "loa_end") {
        await loa_end.handle_loa_end(interaction)
        return
      }
      if (interaction.customId === "music_pause") {
        await music_pause.handle_music_pause(interaction)
        return
      }
      if (interaction.customId === "music_resume") {
        await music_resume.handle_music_resume(interaction)
        return
      }
      if (interaction.customId === "music_skip") {
        await music_skip.handle_music_skip(interaction)
        return
      }
      if (interaction.customId === "music_stop") {
        await music_stop.handle_music_stop(interaction)
        return
      }
      if (interaction.customId === "loa_end") {
        await loa_end.handle_loa_end(interaction)
        return
      }
      if (interaction.customId.startsWith("booster_claim_")) {
        await booster_claim.handle(interaction)
        return
      }
    } catch (err) {
      console.log("[button] Error:", err)
      await log_error(client, err as Error, "Button", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      });
    }
  }

  if (interaction.isModalSubmit()) {
    try {
      if (await handle_ticket_modal(interaction)) return
      if (await handle_devlog(interaction)) return
      if (await handle_tempvoice_modal(interaction)) return
      if (interaction.customId === "review_modal") {
        await handle_review_modal(interaction)
        return
      }
      if (interaction.customId.startsWith("edit_rules:")) {
        await handle_edit_rules_modal(interaction)
        return
      }
      if (interaction.customId === "ask_staff_modal") {
        await handle_ask_staff_modal(interaction)
        return
      }
      if (await handle_reminder_add_new_modal(interaction)) return
      if (await handle_loa_request_modal(interaction)) return
      if (await handle_script_redeem_modal(interaction)) return
      if (await handle_middleman_close_reason_modal(interaction)) return
      if (interaction.customId.startsWith("music_modal:")) {
        await handle_music_modal(interaction)
        return
      }
    } catch (err) {
      console.log("[modal] Error:", err)
      await log_error(client, err as Error, "ModalSubmit", {
        custom_id: interaction.customId,
        user     : interaction.user.tag,
        guild    : interaction.guild?.name || "DM",
        channel  : interaction.channel?.id,
      })
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
  } catch (error) {
    console.error("[Command Error]:", error);
    
    await log_error(client, error as Error, `Command: ${interaction.commandName}`, {
      user: interaction.user.tag,
      guild: interaction.guild?.name || "DM",
      channel: interaction.channel?.id,
    });

    const content = "There was an error executing this command.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content, ephemeral: true });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  }
}
