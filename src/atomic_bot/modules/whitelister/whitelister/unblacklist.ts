import { ChatInputCommandInteraction, SlashCommandBuilder, GuildMember, User } from "discord.js"
import { Command }                                                            from "@shared/types/command"
import { delete_user_from_project, get_user_by_discord, unban_user }        from "../../../infrastructure/api/luarmor"
import { component }                                                          from "@shared/utils"

const ALLOWED_ROLE_ID = "1277272542914281512"
const PROJECT_ID      = "6958841b2d9e5e049a24a23e376e0d77"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("unblacklist")
    .setDescription("Unban a user from the Luarmor project")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to unban")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content  : "This command can only be used in a server",
        ephemeral: true,
      })
      return
    }

    const member = interaction.member as GuildMember

    if (!member || !member.roles || !member.roles.cache.has(ALLOWED_ROLE_ID)) {
      await interaction.reply({
        content  : "You don't have permission to use this command",
        ephemeral: true,
      })
      return
    }

    const user = interaction.options.getUser("user") as User

    if (!user) {
      await interaction.reply({
        content  : "Invalid user",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const user_data = await get_user_by_discord(user.id, PROJECT_ID)

    if (!user_data.success || !user_data.data) {
      await interaction.editReply({
        content: `User <@${user.id}> does not have a key in the project`,
      })
      return
    }

    if (user_data.data.banned !== 1) {
      await interaction.editReply({
        content: `User <@${user.id}> is not banned`,
      })
      return
    }

    if (!user_data.data.unban_token) {
      await interaction.editReply({
        content: `User <@${user.id}> does not have an unban token`,
      })
      return
    }

    const unban_result = await unban_user(user_data.data.unban_token, PROJECT_ID)

    if (!unban_result.success) {
      await interaction.editReply({
        content: unban_result.error || "Failed to unban user",
      })
      return
    }

    const success_message = component.build_message({
      components: [
        component.container({
          accent_color: 0x57F287,
          components: [
            component.text([
              `## User Unbanned`,
              `<@${user.id}> has been unbanned from the project`,
              ``,
              `They can now use the script again`,
            ]),
          ],
        }),
      ],
    })

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send(success_message)
    }

    await interaction.deleteReply()
  },
}
