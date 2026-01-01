import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
} from "discord.js"
import { Command } from "../../types/command"
import { component } from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reaction_roles")
    .setDescription("Setup reaction roles panel")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content  : "This command can only be used in a server.",
        ephemeral: true,
      })
      return
    }

    const member = interaction.member as GuildMember

    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content  : "You need Administrator permission to use this command.",
        ephemeral: true,
      })
      return
    }

    const message = component.build_message({
      components: [
        component.container({
          accent_color: 15277667,
          components: [
            component.text("## Reaction Roles\nReact below to assign or remove roles."),
          ],
        }),
        component.container({
          components: [
            component.text("### Game Roles"),
            component.action_row(
              component.secondary_button(
                "Fish It!",
                "reaction_role_fishit",
                component.emoji_object("fishit", "1456086005097693268")
              ),
              component.secondary_button(
                "Car Driving Indonesia",
                "reaction_role_cdi",
                component.emoji_object("unknown", "1456086035518984395")
              ),
            ),
          ],
        }),
        component.container({
          components: [
            component.text("### Notification Roles"),
            component.action_row(
              component.secondary_button(
                "Executor Update",
                "reaction_role_executor_update",
                component.emoji_object("rbx", "1447976733050667061")
              ),
              component.secondary_button(
                "Roblox Update",
                "reaction_role_roblox_update",
                component.emoji_object("rbx", "1447976733050667061")
              ),
              component.secondary_button(
                "Giveaway Ping",
                "reaction_role_giveaway",
                component.emoji_object("people", "1447977011199873177")
              ),
            ),
          ],
        }),
      ],
    })

    await interaction.reply(message)
  },
}
