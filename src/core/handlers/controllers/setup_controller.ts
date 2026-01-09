import { ChatInputCommandInteraction, GuildMember, ChannelType } from "discord.js"
import { guild_settings, component } from "../../../shared/utils"
import { is_admin } from "../../../shared/database/permissions"
import { log_error } from "../../../shared/utils/error_logger"

/**
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_setup_welcome(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server", ephemeral: true })
      return
    }

    if (!interaction.member) {
      await interaction.reply({ content: "Could not verify your permissions", ephemeral: true })
      return
    }

    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command",
        ephemeral: true,
      })
      return
    }

    const channel = interaction.options.getChannel("channel", true)
    const message = interaction.options.getString("message", false)

    if (!channel || channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: "Please provide a valid text channel",
        ephemeral: true,
      })
      return
    }

    const success = await guild_settings.set_guild_setting(interaction.guildId, "welcome_channel", channel.id)

    if (!success) {
      await interaction.reply({
        content: "Failed to save welcome channel setting",
        ephemeral: true,
      })
      return
    }

    if (message) {
      await guild_settings.set_guild_setting(interaction.guildId, "welcome_message", message)
    }

    const content_lines = [
      `## Welcome Setup Complete`,
      ``,
      `**Channel:** <#${channel.id}>`,
    ]

    if (message) {
      content_lines.push(`**Message:** ${message}`)
    }

    const response = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: content_lines,
            }),
          ],
        }),
      ],
    })

    await interaction.reply({ ...response, ephemeral: true })
  } catch (err) {
    console.error("[ - SETUP WELCOME ERROR - ]", err)
    await log_error(interaction.client, err as Error, "HANDLE_SETUP_WELCOME", {
      guild_id: interaction.guildId,
      user_id: interaction.user.id,
    })
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while setting up welcome channel",
        ephemeral: true,
      })
    }
  }
}

/**
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_setup_ticket(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command",
        ephemeral: true,
      })
      return
    }

    const category_channel = interaction.options.getChannel("category", true)
    const log_channel      = interaction.options.getChannel("log_channel")

    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server", ephemeral: true })
      return
    }

    await guild_settings.set_guild_setting(interaction.guildId, "ticket_category", category_channel.id)

    if (log_channel) {
      await guild_settings.set_guild_setting(interaction.guildId, "ticket_log_channel", log_channel.id)
    }

    const response = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Ticket Setup Complete`,
                ``,
                `**Category:** ${category_channel}`,
                log_channel ? `**Log Channel:** ${log_channel}` : "",
              ].filter(Boolean),
            }),
          ],
        }),
      ],
    })

    await interaction.reply({ ...response, ephemeral: true })
  } catch (err) {
    await log_error(interaction.client, err as Error, "HANDLE_SETUP_TICKET", {
      guild_id: interaction.guildId,
      user_id: interaction.user.id,
    })
    await interaction.reply({
      content: "An error occurred while setting up ticket system",
      ephemeral: true,
    })
  }
}

/**
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_setup_logs(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command",
        ephemeral: true,
      })
      return
    }

    const mod_log_channel    = interaction.options.getChannel("mod_log_channel")
    const member_log_channel = interaction.options.getChannel("member_log_channel")

    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server", ephemeral: true })
      return
    }

    if (mod_log_channel) {
      await guild_settings.set_guild_setting(interaction.guildId, "mod_log_channel", mod_log_channel.id)
    }

    if (member_log_channel) {
      await guild_settings.set_guild_setting(interaction.guildId, "member_log_channel", member_log_channel.id)
    }

    const response = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Logs Setup Complete`,
                ``,
                mod_log_channel ? `**Mod Log Channel:** ${mod_log_channel}` : "",
                member_log_channel ? `**Member Log Channel:** ${member_log_channel}` : "",
              ].filter(Boolean),
            }),
          ],
        }),
      ],
    })

    await interaction.reply({ ...response, ephemeral: true })
  } catch (err) {
    await log_error(interaction.client, err as Error, "HANDLE_SETUP_LOGS", {
      guild_id: interaction.guildId,
      user_id: interaction.user.id,
    })
    await interaction.reply({
      content: "An error occurred while setting up log channels",
      ephemeral: true,
    })
  }
}

/**
 * @param {ChatInputCommandInteraction} interaction - Discord interaction
 * @returns {Promise<void>}
 */
export async function handle_setup_view(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    const member = interaction.member as GuildMember

    if (!is_admin(member)) {
      await interaction.reply({
        content: "You don't have permission to use this command",
        ephemeral: true,
      })
      return
    }

    if (!interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server", ephemeral: true })
      return
    }

    const settings = await guild_settings.get_all_guild_settings(interaction.guildId)

    if (!settings || Object.keys(settings).length === 0) {
      await interaction.reply({
        content: "No settings configured for this server",
        ephemeral: true,
      })
      return
    }

    const settings_list = []

    if (settings.welcome_channel) {
      settings_list.push(`**Welcome Channel:** <#${settings.welcome_channel}>`)
      if (settings.welcome_message) {
        settings_list.push(`**Welcome Message:** ${settings.welcome_message}`)
      }
    }

    if (settings.ticket_category) {
      settings_list.push(`**Ticket Category:** <#${settings.ticket_category}>`)
    }

    if (settings.ticket_log_channel) {
      settings_list.push(`**Ticket Log Channel:** <#${settings.ticket_log_channel}>`)
    }

    if (settings.mod_log_channel) {
      settings_list.push(`**Mod Log Channel:** <#${settings.mod_log_channel}>`)
    }

    if (settings.member_log_channel) {
      settings_list.push(`**Member Log Channel:** <#${settings.member_log_channel}>`)
    }

    if (settings.auto_role) {
      settings_list.push(`**Auto Role:** <@&${settings.auto_role}>`)
    }

    if (settings.verification_channel) {
      settings_list.push(`**Verification Channel:** <#${settings.verification_channel}>`)
    }

    if (settings.rules_channel) {
      settings_list.push(`**Rules Channel:** <#${settings.rules_channel}>`)
    }

    if (settings.announcements_channel) {
      settings_list.push(`**Announcements Channel:** <#${settings.announcements_channel}>`)
    }

    const response = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                `## Server Settings`,
                ``,
                ...settings_list,
              ],
            }),
          ],
        }),
      ],
    })

    await interaction.reply({ ...response, ephemeral: true })
  } catch (err) {
    await log_error(interaction.client, err as Error, "HANDLE_SETUP_VIEW", {
      guild_id: interaction.guildId,
      user_id: interaction.user.id,
    })
    await interaction.reply({
      content: "An error occurred while viewing server settings",
      ephemeral: true,
    })
  }
}
