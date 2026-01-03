import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import { Command }  from "../../types/command"
import { component, format } from "../../utils"

const whois: Command = {
  data: new SlashCommandBuilder()
    .setName("whois")
    .setDescription("Get detailed information about a user")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("The user to get information about")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction) {
    const target_user = interaction.options.getUser("user") || interaction.user
    const member      = interaction.guild?.members.cache.get(target_user.id)

    if (!member) {
      await interaction.reply({
        content  : "User not found in this server.",
        ephemeral: true,
      })
      return
    }

    const roles = member.roles.cache
      .filter(role => role.id !== interaction.guild?.id)
      .sort((a, b) => b.position - a.position)
      .map(role => `<@&${role.id}>`)
      .join(", ") || "No roles"

    const user_info_lines = [
      `## User Information`,
      `**User:** <@${target_user.id}>`,
      `**ID:** \`${target_user.id}\``,
      `**Username:** ${target_user.username}`,
      `**Display Name:** ${member.displayName}`,
      `**Bot:** ${target_user.bot ? "Yes" : "No"}`,
      ``,
      `**Account Created:** <t:${Math.floor(target_user.createdTimestamp / 1000)}:F>`,
      `**Joined Server:** ${member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : "Unknown"}`,
      `**Boosting Since:** ${member.premiumSince ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:F>` : "Not boosting"}`,
      ``,
      `**Roles [${member.roles.cache.size - 1}]:**`,
      roles,
    ]

    const permissions     = member.permissions.toArray()
    const admin_perms     = ["Administrator", "ManageGuild"]
    const moderation_perms = ["BanMembers", "KickMembers", "ModerateMembers", "ManageMessages", "ManageNicknames", "ManageThreads"]
    const management_perms = ["ManageRoles", "ManageChannels", "ManageWebhooks", "ManageEmojisAndStickers", "ManageEvents", "ManageExpressions"]
    const voice_perms     = ["MuteMembers", "DeafenMembers", "MoveMembers", "ManageVoice"]
    const advanced_perms  = ["ViewAuditLog", "ViewGuildInsights", "ViewCreatorMonetizationAnalytics", "CreateGuildExpressions", "CreateEvents"]
    const special_perms   = ["MentionEveryone", "SendTTSMessages", "SendVoiceMessages", "UseExternalEmojis", "UseExternalStickers", "UseApplicationCommands", "UseEmbeddedActivities"]

    const has_admin       = admin_perms.filter(perm => permissions.includes(perm as any))
    const has_moderation  = moderation_perms.filter(perm => permissions.includes(perm as any))
    const has_management  = management_perms.filter(perm => permissions.includes(perm as any))
    const has_voice       = voice_perms.filter(perm => permissions.includes(perm as any))
    const has_advanced    = advanced_perms.filter(perm => permissions.includes(perm as any))
    const has_special     = special_perms.filter(perm => permissions.includes(perm as any))

    if (has_admin.length > 0 || has_moderation.length > 0 || has_management.length > 0 || has_voice.length > 0 || has_advanced.length > 0 || has_special.length > 0) {
      user_info_lines.push(``, `**Permissions:**`)
      
      if (has_admin.length > 0) {
        user_info_lines.push(`**Administrator:** ${has_admin.map(p => `\`${p}\``).join(", ")}`)
      }
      if (has_moderation.length > 0) {
        user_info_lines.push(`**Moderation:** ${has_moderation.map(p => `\`${p}\``).join(", ")}`)
      }
      if (has_management.length > 0) {
        user_info_lines.push(`**Management:** ${has_management.map(p => `\`${p}\``).join(", ")}`)
      }
      if (has_voice.length > 0) {
        user_info_lines.push(`**Voice:** ${has_voice.map(p => `\`${p}\``).join(", ")}`)
      }
      if (has_advanced.length > 0) {
        user_info_lines.push(`**Advanced:** ${has_advanced.map(p => `\`${p}\``).join(", ")}`)
      }
      if (has_special.length > 0) {
        user_info_lines.push(`**Special:** ${has_special.map(p => `\`${p}\``).join(", ")}`)
      }
    }

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content  : user_info_lines,
              thumbnail: target_user.displayAvatarURL({ extension: "png", size: 256 }),
            }),
          ],
        }),
      ],
    })

    await interaction.reply(message)
  },
}

export default whois
