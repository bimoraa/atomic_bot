import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PermissionFlagsBits,
}                      from "discord.js"
import { Command }     from "../../../types/command"
import { component }   from "../../../utils"
import * as database   from "../../../utils/database"

interface Warning {
  id          : string
  guild_id    : string
  user_id     : string
  moderator_id: string
  reason      : string
  timestamp   : number
}

async function get_warnings(guild_id: string, user_id: string): Promise<Warning[]> {
  try {
    const warnings = await database.collection<Warning>("warnings")
      .find({ guild_id, user_id })
      .sort({ timestamp: -1 })
      .toArray()
    return warnings
  } catch {
    return []
  }
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings for a member")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("The member to check warnings for")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const executor = interaction.member as GuildMember
    const target   = (interaction.options.getMember("member") as GuildMember) || executor
    const guild_id = interaction.guild?.id

    if (!guild_id) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content   : "You don't have permission to view warnings.",
        ephemeral : true,
      })
      return
    }

    const user_warnings = await get_warnings(guild_id, target.id)

    if (user_warnings.length === 0) {
      const avatar_url = target.user.displayAvatarURL({ size: 512 })

      const no_warnings_message = component.build_message({
        components: [
          component.container({
            accent_color: 0x57F287,
            components: [
              component.section({
                content: [
                  "### No Warnings",
                  `- Member: <@${target.id}>`,
                  "- This member has no warnings.",
                ].join("\n"),
                thumbnail: avatar_url,
              }),
            ],
          }),
        ],
      })

      await interaction.reply({
        ...no_warnings_message,
        ephemeral: true,
      })
      return
    }

    const avatar_url = target.user.displayAvatarURL({ size: 512 })
    const warning_list = user_warnings.map((w, i) => {
      const date = new Date(w.timestamp)
      return `${i + 1}. <t:${Math.floor(w.timestamp / 1000)}:F>\n   - Warned by: <@${w.moderator_id}>\n   - Reason: ${w.reason}`
    }).join("\n\n")

    const warnings_message = component.build_message({
      components: [
        component.container({
          accent_color: 0xFEE75C,
          components: [
            component.section({
              content: [
                `### Warnings for ${target.user.username}`,
                `- Total Warnings: ${user_warnings.length}`,
              ].join("\n"),
              thumbnail: avatar_url,
            }),
            component.divider(),
            component.text(warning_list),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...warnings_message,
      ephemeral: true,
    })
  },
}

export async function add_warning(
  guild_id    : string,
  user_id     : string,
  moderator_id: string,
  reason      : string
): Promise<void> {
  const warning: Warning = {
    id          : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    guild_id    : guild_id,
    user_id     : user_id,
    moderator_id: moderator_id,
    reason      : reason,
    timestamp   : Date.now(),
  }

  await database.collection<Warning>("warnings").insertOne(warning as any)
}
