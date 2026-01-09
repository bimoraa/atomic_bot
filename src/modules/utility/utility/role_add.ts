import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, Role } from "discord.js"
import { Command } from "../../../shared/types/command"
import { is_admin } from "../../../shared/database/permissions"
import { api, component } from "../../../shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("role_add")
    .setDescription("Add a role to a member")
    .addUserOption(opt =>
      opt.setName("member")
        .setDescription("The member to add the role to")
        .setRequired(true)
    )
    .addRoleOption(opt =>
      opt.setName("role")
        .setDescription("The role to add")
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember

    if (!is_admin(executor)) {
      await interaction.reply({
        content: "Only admins can use this command.",
        flags: 64,
      })
      return
    }

    await interaction.deferReply({ flags: 32768 } as any)

    const member = interaction.options.getMember("member") as GuildMember | null
    const role = interaction.options.getRole("role") as Role | null

    if (!member) {
      await api.edit_deferred_reply(interaction, {
        components: [
          component.container({
            accent_color: 0xff0000,
            components: [
              component.text("## Error\nMember not found."),
            ],
          }),
        ],
      })
      return
    }

    if (!role) {
      await api.edit_deferred_reply(interaction, {
        components: [
          component.container({
            accent_color: 0xff0000,
            components: [
              component.text("## Error\nRole not found."),
            ],
          }),
        ],
      })
      return
    }

    if (member.roles.cache.has(role.id)) {
      await api.edit_deferred_reply(interaction, {
        components: [
          component.container({
            accent_color: 0xffcc00,
            components: [
              component.text(`## Warning\n${member} already has ${role}.`),
            ],
          }),
        ],
      })
      return
    }

    try {
      await member.roles.add(role)
      await api.edit_deferred_reply(interaction, {
        components: [
          component.container({
            accent_color: 0x00ff00,
            components: [
              component.text(`## Role Added\nAdded ${role} to ${member}.`),
            ],
          }),
        ],
      })
    } catch (error) {
      await api.edit_deferred_reply(interaction, {
        components: [
          component.container({
            accent_color: 0xff0000,
            components: [
              component.text("## Failed\nMake sure the bot has permission and the role is below the bot's highest role."),
            ],
          }),
        ],
      })
    }
  },
}
