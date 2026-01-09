import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  TextChannel,
  Role,
  Guild,
} from "discord.js"
import { Command }              from "../../shared/types/command"
import { is_admin }             from "../../shared/database/permissions"
import { component, api, format } from "../../shared/utils"

interface ReactionRole {
  emoji_id   : string
  emoji_name : string
  role_name  : string
  role_id?   : string
}

const reaction_roles: ReactionRole[] = [
  { emoji_id: "1447976297299972248", emoji_name: "executoru", role_name: "Executor Update" },
  { emoji_id: "1447976733050667061", emoji_name: "rbx", role_name: "Roblox Update" },
  { emoji_id: "1447977011199873177", emoji_name: "people", role_name: "Giveaway Ping" },
]

async function get_or_create_role(guild: Guild, role_name: string): Promise<Role> {
  let role = guild.roles.cache.find((r: Role) => r.name === role_name)

  if (!role) {
    role = await guild.roles.create({
      name       : role_name,
      mentionable: false,
      reason     : "Reaction role setup",
    })
  }

  return role
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("setup-reaction-panel")
    .setDescription("Setup reaction roles panel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!is_admin(interaction.member as GuildMember)) {
      await interaction.reply({
        content: "You don't have permission to use this command.",
        flags: 64,
      })
      return
    }

    await interaction.deferReply({ flags: 64 })

    const guild = interaction.guild!
    const roles_with_ids: ReactionRole[] = []

    for (const rr of reaction_roles) {
      const role = await get_or_create_role(guild, rr.role_name)
      roles_with_ids.push({
        ...rr,
        role_id: role.id,
      })
    }

    const panel_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content: [
                "## Notification Roles",
                "Click the buttons below to get or remove notification roles.",
              ],
              thumbnail: format.logo_url,
            }),
            component.divider(1),
            component.text(
              roles_with_ids
                .map((rr, index) => `${index + 1}. <:${rr.emoji_name}:${rr.emoji_id}> - **${rr.role_name}**`)
                .join("\n")
            ),
            component.divider(1),
            component.action_row(
              ...roles_with_ids.map(rr =>
                component.secondary_button(
                  rr.role_name,
                  `reaction_role_${rr.role_id}`,
                  { id: rr.emoji_id, name: rr.emoji_name },
                )
              ),
            ),
          ],
        }),
      ],
    })

    const channel = interaction.channel as TextChannel
    const result = await api.send_components_v2(channel.id, api.get_token(), panel_message)

    if (result.error) {
      await interaction.editReply({ content: `Error: ${JSON.stringify(result)}` })
      return
    }

    await interaction.editReply({ content: "Reaction roles panel created!" })
  },
}

export default command
