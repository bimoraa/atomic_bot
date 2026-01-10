import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, MessageFlags } from "discord.js"
import { Command } from "../../shared/types/command"
import { check_bio_and_add_roles, bulk_check_bios } from "../../core/handlers/bio_role_checker"
import { is_owner } from "../../shared/database/permissions"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("bio-check")
    .setDescription("Check user bio for invite link and add roles")
    .addSubcommand(sub =>
      sub.setName("user")
        .setDescription("Check specific user bio")
        .addUserOption(opt =>
          opt.setName("target")
            .setDescription("User to check")
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName("bulk")
        .setDescription("Check all server members (OWNER ONLY)")
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const member      = interaction.member as GuildMember
    const subcommand  = interaction.options.getSubcommand()

    if (subcommand === "bulk" && !is_owner(member)) {
      await interaction.reply({
        content: "Only bot owner can run bulk check.",
        flags  : MessageFlags.Ephemeral,
      })
      return
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    if (subcommand === "user") {
      const target_user   = interaction.options.getUser("target", true)
      const target_member = await interaction.guild?.members.fetch(target_user.id)

      if (!target_member) {
        await interaction.editReply("Member not found.")
        return
      }

      const result = await check_bio_and_add_roles(target_member)

      if (result) {
        await interaction.editReply(`Bio contains target link! Roles added to <@${target_user.id}>.`)
      } else {
        await interaction.editReply(`Bio does not contain target link or already has roles.`)
      }
    } else if (subcommand === "bulk") {
      await interaction.editReply("Starting bulk bio check... This may take a while.")

      const count = await bulk_check_bios(interaction.client, interaction.guildId!)

      await interaction.editReply(`Bulk check complete! ${count} members received roles.`)
    }
  },
}

export default command
