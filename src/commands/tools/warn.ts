import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                        from "discord.js"
import { Command }       from "../../types/command"
import { warn_member }   from "../../interactions/controller/moderation_controller"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for warning")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = interaction.options.getMember("member") as GuildMember
    const reason   = interaction.options.getString("reason", true)
    const guild    = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!target) {
      await interaction.reply({
        content   : "Invalid member.",
        ephemeral : true,
      })
      return
    }

    const result = await warn_member({
      client   : interaction.client,
      guild,
      executor,
      target,
      reason,
    })

    if (result.success) {
      await interaction.reply({
        ...result.message,
        ephemeral: true,
      })
    } else {
      await interaction.reply({
        content   : result.error || "Failed to warn member",
        ephemeral : true,
      })
    }
  },
}
      } catch {
      }

      await add_warning(interaction.guild!.id, target.id, executor.id, reason)

      const avatar_url = target.user.displayAvatarURL({ size: 512 })

      const warn_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.section({
                content: [
                  "### Member Warned",
                  `- Member: <@${target.id}>`,
                  `- Warned by: <@${executor.id}>`,
                  `- Reason: ${reason}`,
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await interaction.reply(warn_message)
    } catch (error) {
      const error_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xED4245,
            components: [
              component.text([
                "### Failed to warn member",
                `- Error: ${error instanceof Error ? error.message : "Unknown error"}`,
              ].join("\n")),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...error_message,
        ephemeral: true,
      })
    }
  },
}
