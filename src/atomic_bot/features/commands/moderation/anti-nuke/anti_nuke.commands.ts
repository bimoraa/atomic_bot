/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /anti-nuke slash command: config, whitelist, logs - \\
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
}                               from "discord.js"
import { component, time }      from "@utils"
import { log_error }            from "@utils/error_logger"
import { Command }              from "@shared/types/command"
import {
  get_config,
  update_config,
  set_maintenance,
  get_whitelist,
  add_whitelist,
  remove_whitelist,
  get_recent_incidents,
}                               from "@managers/anti_nuke_manager"

/**
 * @description /anti-nuke slash command — manage anti-nuke system settings
 * @param interaction - Discord ChatInputCommandInteraction
 * @returns Promise<void>
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("anti-nuke")
    .setDescription("Manage the anti-nuke security system")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName("config")
      .setDescription("Enable, disable, or toggle maintenance mode")
      .addStringOption(opt => opt
        .setName("action")
        .setDescription("Action to perform")
        .setRequired(true)
        .addChoices(
          { name: "Enable",  value: "enable"  },
          { name: "Disable", value: "disable" },
          { name: "Pause (maintenance mode)",  value: "pause"  },
          { name: "Resume (end maintenance)",  value: "resume" },
          { name: "Set log channel (current channel)", value: "set_log" },
        )
      )
      .addNumberOption(opt => opt
        .setName("minutes")
        .setDescription("Maintenance duration in minutes (only used with pause)")
        .setMinValue(1)
        .setMaxValue(1440)
        .setRequired(false)
      )
    )
    .addSubcommand(sub => sub
      .setName("whitelist")
      .setDescription("Manage the whitelist of trusted users")
      .addStringOption(opt => opt
        .setName("action")
        .setDescription("What to do")
        .setRequired(true)
        .addChoices(
          { name: "Add user",    value: "add"    },
          { name: "Remove user", value: "remove" },
          { name: "List",        value: "list"   },
        )
      )
      .addUserOption(opt => opt
        .setName("user")
        .setDescription("User to add or remove (required for add/remove)")
        .setRequired(false)
      )
    )
    .addSubcommand(sub => sub
      .setName("logs")
      .setDescription("View the most recent anti-nuke incidents")
    ) as SlashCommandBuilder,

  execute: async (interaction: ChatInputCommandInteraction) => {
    const sub = interaction.options.getSubcommand()

    try {
      if (sub === "config")    return await handle_config(interaction)
      if (sub === "whitelist") return await handle_whitelist(interaction)
      if (sub === "logs")      return await handle_logs(interaction)
    } catch (err) {
      await log_error(interaction.client, err as Error, "Anti-Nuke Command", {
        guild_id: interaction.guildId ?? "",
        user_id : interaction.user.id,
      }).catch(() => {})

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ ...component.build_message({
          components: [component.container({
            accent_color: 0xED4245,
            components  : [component.text("An error occurred while executing this command.")],
          })],
        }), ephemeral: true }).catch(() => {})
      }
    }
  },
}

// ─── config handler ──────────────────────────────────────────────────────────

async function handle_config(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return

  const action  = interaction.options.getString("action", true)
  const minutes = interaction.options.getNumber("minutes") ?? 60

  await interaction.deferReply({ ephemeral: true })

  if (action === "enable") {
    await update_config(interaction.guildId, { enabled: true })
    await reply_success(interaction, "Anti-Nuke Enabled", "The anti-nuke system is now active for this server.")
    return
  }

  if (action === "disable") {
    await update_config(interaction.guildId, { enabled: false })
    await reply_success(interaction, "Anti-Nuke Disabled", "The anti-nuke system has been turned off. All guild events will be ignored.")
    return
  }

  if (action === "pause") {
    await set_maintenance(interaction.guildId, true, minutes)
    await reply_success(interaction, "Maintenance Mode Active", `Anti-nuke is paused for **${minutes} minutes**. Useful before bulk admin operations.`)
    return
  }

  if (action === "resume") {
    await set_maintenance(interaction.guildId, false)
    await reply_success(interaction, "Maintenance Mode Ended", "Anti-nuke is now active again.")
    return
  }

  if (action === "set_log") {
    const channel_id = interaction.channelId
    await update_config(interaction.guildId, { log_channel_id: channel_id })
    await reply_success(interaction, "Log Channel Set", `Anti-nuke alerts will now be sent to <#${channel_id}>.`)
    return
  }
}

// ─── whitelist handler ───────────────────────────────────────────────────────

async function handle_whitelist(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return

  const action = interaction.options.getString("action", true)
  const target = interaction.options.getUser("user")

  await interaction.deferReply({ ephemeral: true })

  if (action === "add") {
    if (!target) {
      await reply_error(interaction, "Please select a user to whitelist.")
      return
    }

    if (target.id === interaction.guildId) {
      await reply_error(interaction, "You cannot whitelist the server itself.")
      return
    }

    await add_whitelist(target.id, interaction.guildId, interaction.user.id)
    await reply_success(interaction, "User Whitelisted", `<@${target.id}> has been added to the anti-nuke whitelist and will not be monitored.`)
    return
  }

  if (action === "remove") {
    if (!target) {
      await reply_error(interaction, "Please select a user to remove from the whitelist.")
      return
    }

    const removed = await remove_whitelist(target.id, interaction.guildId)
    if (!removed) {
      await reply_error(interaction, `<@${target.id}> is not currently whitelisted.`)
      return
    }

    await reply_success(interaction, "User Removed", `<@${target.id}> has been removed from the whitelist and will now be monitored.`)
    return
  }

  if (action === "list") {
    const entries = await get_whitelist(interaction.guildId)

    const lines = entries.length > 0
      ? entries.map(e => `- <@${e.user_id}> — added by <@${e.added_by}> at ${time.relative_time(e.added_at)}`)
      : ["- No users are whitelisted."]

    await interaction.editReply({
      ...component.build_message({
        components: [
          component.container({
            accent_color: 0x5865F2,
            components  : [
              component.text([
                "### Anti-Nuke Whitelist",
                ...lines,
              ]),
            ],
          }),
        ],
      }),
    })
    return
  }
}

// ─── logs handler ────────────────────────────────────────────────────────────

async function handle_logs(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) return

  await interaction.deferReply({ ephemeral: true })

  const incidents = await get_recent_incidents(interaction.guildId, 8)

  if (incidents.length === 0) {
    await reply_success(interaction, "No Incidents", "No anti-nuke incidents have been recorded for this server.")
    return
  }

  const lines = incidents.map((inc, i) => [
    `**${i + 1}.** <@${inc.executor_id}> — Score: **${inc.final_score}**`,
    `> Action: ${inc.action_taken} | Events: ${inc.event_count}x (${inc.event_types.join(", ")})`,
    `> ${time.relative_time(inc.timestamp)} | ID: \`${inc.incident_id.slice(0, 8)}\`${inc.reverted ? " — **Reverted**" : ""}`,
  ].join("\n"))

  await interaction.editReply({
    ...component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components  : [
            component.text([
              "### Anti-Nuke Recent Incidents",
              ...lines,
            ]),
          ],
        }),
      ],
    }),
  })
}

// ─── reply helpers ────────────────────────────────────────────────────────────

async function reply_success(
  interaction : ChatInputCommandInteraction,
  title       : string,
  description : string,
): Promise<void> {
  await interaction.editReply({
    ...component.build_message({
      components: [
        component.container({
          accent_color: 0x57F287,
          components  : [component.text([`### ${title}`, description])],
        }),
      ],
    }),
  })
}

async function reply_error(
  interaction : ChatInputCommandInteraction,
  description : string,
): Promise<void> {
  await interaction.editReply({
    ...component.build_message({
      components: [
        component.container({
          accent_color: 0xED4245,
          components  : [component.text(description)],
        }),
      ],
    }),
  })
}
