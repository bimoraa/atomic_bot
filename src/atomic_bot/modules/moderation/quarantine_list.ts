import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                                            from "discord.js"
import { Command }                            from "@shared/types/command"
import { get_guild_quarantines }              from "@shared/database/managers/quarantine_manager"
import { component, time }                    from "@shared/utils"

/**
 * @description List all quarantined members command
 */
export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quarantine-list")
    .setDescription("View all quarantined members")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const guild    = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has("ModerateMembers")) {
      await interaction.reply({
        content   : "You don't have permission to view quarantined members.",
        ephemeral : true,
      })
      return
    }

    const quarantines = await get_guild_quarantines(guild.id)

    if (quarantines.length === 0) {
      await interaction.reply({
        ...component.build_message({
          components: [
            component.container({
              accent_color: 0x808080,
              components: [
                component.text("### Quarantined Members"),
                component.divider(),
                component.text("- Status: No quarantined members found"),
              ],
            }),
          ],
        }),
        ephemeral: true,
      })
      return
    }

    const now   = Math.floor(Date.now() / 1000)
    const lines = quarantines.map((q, i) => {
      const remaining = q.release_at - now
      const days_left = Math.ceil(remaining / (24 * 60 * 60))
      
      return [
        `${i + 1}. <@${q.user_id}>`,
        `> Release: ${time.relative_time(q.release_at)} || ${time.full_date_time(q.release_at)}`,
        `> Days left: ${days_left} days`,
        `> Reason: ${q.reason}`,
      ].join("\n")
    })

    await interaction.reply({
      ...component.build_message({
        components: [
          component.container({
            accent_color: 0x808080,
            components: [
              component.text("### Quarantined Members"),
              component.divider(),
              component.text([
                `- Total: ${quarantines.length} members`,
                "",
                ...lines,
              ]),
            ],
          }),
        ],
      }),
      ephemeral: true,
    })
  },
}
