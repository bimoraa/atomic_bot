import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, TextChannel, Role } from "discord.js"
import { Command } from "../../types/command"
import { is_admin } from "../../functions/permissions"
import { component, api, format } from "../../utils"

interface ReactionRole {
  emoji_id: string
  emoji_name: string
  role_name: string
  role_id?: string
}

const reaction_roles: ReactionRole[] = [
  { emoji_id: "1447976297299972248", emoji_name: "executoru", role_name: "Executor Update" },
  { emoji_id: "1447976733050667061", emoji_name: "rbx", role_name: "Roblox Update" },
  { emoji_id: "1447977011199873177", emoji_name: "people", role_name: "Giveaway Ping" },
]

async function get_or_create_role(guild: any, role_name: string): Promise<Role> {
  let role = guild.roles.cache.find((r: Role) => r.name === role_name)
  
  if (!role) {
    role = await guild.roles.create({
      name: role_name,
      mentionable: false,
      reason: "Reaction role setup",
    })
    console.log(`[reaction_panel] Created role: ${role_name}`)
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

    const panel_message = {
      flags: 32768,
      components: [
        {
          type: 17,
          components: [
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: [
                    `## Notification Roles`,
                    `Click the buttons below to get or remove notification roles.`,
                  ].join("\n"),
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: format.logo_url,
                },
              },
            },
            {
              type: 14,
              spacing: 1,
            },
            {
              type: 10,
              content: roles_with_ids.map((rr, index) => 
                `${index + 1}. <:${rr.emoji_name}:${rr.emoji_id}> - **${rr.role_name}**`
              ).join("\n"),
            },
            {
              type: 14,
              spacing: 1,
            },
            {
              type: 1,
              components: roles_with_ids.map(rr => ({
                type: 2,
                style: 2,
                emoji: { id: rr.emoji_id },
                label: rr.role_name,
                custom_id: `reaction_role_${rr.role_id}`,
              })),
            },
          ],
        },
      ],
    }

    const channel = interaction.channel as TextChannel
    const result = await api.send_components_v2(channel.id, api.get_token(), panel_message as any)

    if (result.error) {
      await interaction.editReply({ content: `Error: ${JSON.stringify(result)}` })
      return
    }

    await interaction.editReply({ content: "Reaction roles panel created!" })
  },
}

export default command
