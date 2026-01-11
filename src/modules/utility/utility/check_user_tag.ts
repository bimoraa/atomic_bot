import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, PermissionFlagsBits } from "discord.js"
import { Command }                                                                           from "../../../shared/types/command"
import { get_all_tagged_users, sync_guild_tagged_users }                                     from "../../../shared/database/settings/server_tag"
import { component }                                                                         from "../../../shared/utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check-user-tag")
    .setDescription("Check all users who are using the server tag")
    .addBooleanOption(option =>
      option
        .setName("scan")
        .setDescription("Scan all server members to sync server tag data")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild     = interaction.guild
    const scan_mode = interaction.options.getBoolean("scan") ?? false

    if (!guild) {
      await interaction.reply({
        content  : "This command can only be used in a server",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    if (scan_mode) {
      const scan_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xFEE75C,
            components: [
              component.text([
                `## Scanning Members`,
                `Scanning all server members for server tags...`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(scan_message)

      const synced_count = await sync_guild_tagged_users(interaction.client, guild.id)

      const result_message = component.build_message({
        components: [
          component.container({
            accent_color: 0x57F287,
            components: [
              component.text([
                `## Sync Complete`,
                `Found and synced **${synced_count}** new users with server tags`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(result_message)
      return
    }

    const tagged_users = await get_all_tagged_users(guild.id)

    if (tagged_users.length === 0) {
      const no_users_message = component.build_message({
        components: [
          component.container({
            accent_color: 0xED4245,
            components: [
              component.text([
                `## No Tagged Users`,
                `No users are currently using the server tag`,
              ]),
            ],
          }),
        ],
      })

      await interaction.editReply(no_users_message)
      return
    }

    const user_list = tagged_users
      .slice(0, 25)
      .map((user, index) => {
        const timestamp = Math.floor(user.added_at / 1000)
        return `${index + 1}. <@${user.user_id}> - Tag: \`${user.tag}\` - <t:${timestamp}:R>`
      })
      .join("\n")

    const total_count = tagged_users.length
    const showing     = Math.min(total_count, 25)

    const list_message = component.build_message({
      components: [
        component.container({
          accent_color: 0x5865F2,
          components: [
            component.text([
              `## Server Tag Users`,
              `Total users with server tag: **${total_count}**`,
              `Showing: **${showing}**`,
            ]),
          ],
        }),
        component.container({
          components: [
            component.text(user_list),
          ],
        }),
      ],
    })

    await interaction.editReply(list_message)
  },
}
