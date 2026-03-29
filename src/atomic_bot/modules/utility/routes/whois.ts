/*
 * Atomicals Bot for Discord
 * Copyright (C) 2026 Atomicals LancarJaya
 *
 * Licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
 * You may not use this file except in compliance with the License.
 * See the LICENSE file for more information.
 */

// - /whois 斜杠命令，查看用户详细信息 - \
// - /whois slash command, shows detailed info about a user - \
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js"
import { Command }  from "@shared/types/command"
import { component } from "@shared/utils"

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
    const member      = interaction.guild ? await interaction.guild.members.fetch(target_user.id).catch(() => null) : null

    if (!member) {
      await interaction.reply({
        content  : "User not found in this server.", ephemeral: true,
      })
      return
    }

    // - 通过 REST 获取服务器角色（角色缓存已禁用） - \\
    // - fetch guild roles via rest since guild role cache is disabled - \\
    const guild_roles = await interaction.guild!.roles.fetch().catch(() => null)
    const raw_roles   = (member as any)._roles as string[] ?? []
    const role_list   = guild_roles
      ? raw_roles
          .filter(id => id !== interaction.guild?.id)
          .map(id => guild_roles.get(id))
          .filter(Boolean)
          .sort((a, b) => (b!.position ?? 0) - (a!.position ?? 0))
          .map(role => `<@&${role!.id}>`)
      : raw_roles.map(id => `<@&${id}>`)

    const roles_display = role_list.length > 15
      ? `${role_list.slice(0, 15).join(" ")} +${role_list.length - 15} more`
      : role_list.join(" ") || "None"

    const user_info = [
      `## User Information`,
      `- User: <@${target_user.id}>`,
      `- Joined: ${member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : "Unknown"}`,
      `- Registered: <t:${Math.floor(target_user.createdTimestamp / 1000)}:R>`,
    ].join("\n")

    const roles_info = [
      `- Roles [${raw_roles.length}]:`,
      roles_display,
    ].join("\n")

    const permissions      = member.permissions.toArray()
    const admin_perms      = ["Administrator", "ManageGuild"]
    const moderation_perms = ["BanMembers", "KickMembers", "ModerateMembers", "ManageMessages"]
    const management_perms = ["ManageRoles", "ManageChannels", "ManageWebhooks"]

    const has_admin      = admin_perms.filter(perm => permissions.includes(perm as any))
    const has_moderation = moderation_perms.filter(perm => permissions.includes(perm as any))
    const has_management = management_perms.filter(perm => permissions.includes(perm as any))

    const permission_lines = ["- Permission:"]
    if (has_admin.length > 0) permission_lines.push(`  Administrator: ${has_admin.join(", ")}`)
    if (has_moderation.length > 0) permission_lines.push(`  Moderation: ${has_moderation.join(", ")}`)
    if (has_management.length > 0) permission_lines.push(`  Management: ${has_management.join(", ")}`)
    if (permission_lines.length === 1) permission_lines.push("  None")

    const permission_info = permission_lines.join("\n")

    const acknowledgements_lines = ["- Acknowledgements:"]
    if (target_user.bot) acknowledgements_lines.push("  Bot Account")
    if (member.premiumSince) acknowledgements_lines.push(`  Server Booster since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>`)
    if (member.guild.ownerId === target_user.id) acknowledgements_lines.push("  Server Owner")
    if (acknowledgements_lines.length === 1) acknowledgements_lines.push("  None")

    const acknowledgements_info = acknowledgements_lines.join("\n")

    const user_avatar = target_user.displayAvatarURL({ extension: "png", size: 256 })

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content  : user_info,
              thumbnail: user_avatar,
            }),
            component.divider(2),
            component.text(roles_info),
            component.divider(2),
            component.text(permission_info),
            component.divider(2),
            component.text(acknowledgements_info),
          ],
        }),
      ],
    })

    await interaction.reply({ ...message, ephemeral: true})
  },
}

export default whois
