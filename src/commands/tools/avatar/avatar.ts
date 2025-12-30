import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  User,
}                           from "discord.js"
import { Command }          from "../../../types/command"
import { component }        from "../../../utils"
import { log_error }        from "../../../utils/error_logger"

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

      const avatar_url = target_user.displayAvatarURL({
        size: 4096,
        extension: "png",
      })

      const avatar_gif_url = target_user.displayAvatarURL({
        size: 4096,
        extension: "gif",
      })

      const is_animated = avatar_gif_url.includes(".gif")
      const final_avatar_url = is_animated ? avatar_gif_url : avatar_url

      const download_links = [
        component.link_button("PNG", avatar_url),
      ]

      if (is_animated) {
        download_links.push(component.link_button("GIF", avatar_gif_url))
      }

      const download_links_jpg = target_user.displayAvatarURL({
        size: 4096,
        extension: "jpg",
      })

      const download_links_webp = target_user.displayAvatarURL({
        size: 4096,
        extension: "webp",
      })

      download_links.push(component.link_button("JPG", download_links_jpg))
      download_links.push(component.link_button("WEBP", download_links_webp))

      const payload = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content  : `**${target_user.username}** Avatar`,
                thumbnail: final_avatar_url,
              }),
              component.divider(),
              component.text(`User: ${target_user.tag}`),
              component.text(`ID: ${target_user.id}`),
              component.divider(),
              component.action_row(...download_links),
            ],
            accent_color: component.from_hex("#5865F2"),
          }),
        ],
      })

      await interaction.reply(payload)
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
