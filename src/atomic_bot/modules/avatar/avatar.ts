import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  User,
}                           from "discord.js"
import { Command }          from "@shared/types/command"
import { component }        from "@shared/utils"
import { log_error }        from "@shared/utils/error_logger"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Display user avatar")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to get avatar from")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const target_user = interaction.options.getUser("user") || interaction.user
      const member      = interaction.guild?.members.cache.get(target_user.id)

      const default_avatar = target_user.displayAvatarURL({
        size     : 4096,
        extension: "png",
      })

      const server_avatar = member?.avatarURL({
        size     : 4096,
        extension: "png",
      })

      const has_server_avatar = server_avatar && server_avatar !== default_avatar

      if (has_server_avatar) {
        const payload = component.build_message({
          components: [
            component.container({
              components: [
                component.media_gallery([
                  component.gallery_item(server_avatar),
                  component.gallery_item(default_avatar),
                ]),
              ],
            }),
          ],
        })

        await interaction.reply(payload)
      } else {
        const payload = component.build_message({
          components: [
            component.container({
              components: [
                component.media_gallery([
                  component.gallery_item(default_avatar),
                ]),
              ],
            }),
          ],
        })

        await interaction.reply(payload)
      }
    } catch (error) {
      await log_error(interaction.client, error as Error, "avatar_command", {
        user   : interaction.user.id,
        channel: interaction.channelId,
      })

      const error_payload = component.build_message({
        components: [
          component.container({
            components: [
              component.text("An error occurred while fetching the avatar. Please try again later."),
            ],
            accent_color: component.from_hex("#FF0000"),
          }),
        ],
      })

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ ...error_payload, ephemeral: true })
      } else {
        await interaction.reply({ ...error_payload, ephemeral: true })
      }
    }
  },
}
