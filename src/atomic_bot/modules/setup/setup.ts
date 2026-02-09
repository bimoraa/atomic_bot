import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
} from "discord.js"
import { Command } from "@shared/types/command"
import {
  handle_setup_welcome,
  handle_setup_ticket,
  handle_setup_logs,
  handle_setup_view,
} from "../../core/handlers/controllers"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure server settings")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("welcome")
        .setDescription("Setup welcome message configuration")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send welcome messages")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("The welcome message to send (use {user} for mention)")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ticket")
        .setDescription("Setup ticket system configuration")
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category for tickets")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("log_channel")
            .setDescription("The channel for ticket logs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("logs")
        .setDescription("Setup logging channels")
        .addChannelOption((option) =>
          option
            .setName("mod_log_channel")
            .setDescription("The channel for moderation logs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption((option) =>
          option
            .setName("member_log_channel")
            .setDescription("The channel for member logs")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("View current server configuration")
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case "welcome":
        await handle_setup_welcome(interaction)
        break
      case "ticket":
        await handle_setup_ticket(interaction)
        break
      case "logs":
        await handle_setup_logs(interaction)
        break
      case "view":
        await handle_setup_view(interaction)
        break
      default:
        await interaction.reply({
          content: "Unknown subcommand",
          ephemeral: true,
        })
    }
  },
}
