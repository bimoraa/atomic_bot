import { ButtonInteraction }  from "discord.js"
import { component, api }     from "@shared/utils"
import { log_error }          from "@shared/utils/error_logger"

/**
 * @description Handle server/global avatar toggle buttons from ?av command
 * @param interaction - The button interaction
 * @returns {Promise<boolean>} True if handled, false otherwise
 */
export async function handle_av_toggle(interaction: ButtonInteraction): Promise<boolean> {
  const { customId } = interaction

  if (!customId.startsWith("av_server_") && !customId.startsWith("av_global_")) {
    return false
  }

  await interaction.deferUpdate()

  const is_server = customId.startsWith("av_server_")
  const user_id   = customId.replace(/^av_(server|global)_/, "")

  try {
    const guild = interaction.guild
    if (!guild) return true

    const user          = await interaction.client.users.fetch(user_id)
    const global_avatar = user.displayAvatarURL({ size: 4096, extension: "png" })

    let server_avatar: string | null = null

    try {
      const member  = await guild.members.fetch(user_id)
      const raw_url = member.avatarURL({ size: 4096, extension: "png" })

      if (raw_url && raw_url !== global_avatar) {
        server_avatar = raw_url
      }
    } catch {}

    if (!server_avatar) return true

    const display_url = is_server ? server_avatar : global_avatar

    const new_payload = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`## <@${user_id}>'s Avatar\n`),
          ],
        }),
        component.container({
          components: [
            component.media_gallery([
              component.gallery_item(display_url),
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Server Avatar", `av_server_${user_id}`, undefined, is_server),
              component.secondary_button("Global Avatar", `av_global_${user_id}`, undefined, !is_server),
            ),
          ],
        }),
      ],
    })

    await api.edit_components_v2(
      interaction.channelId,
      interaction.message.id,
      api.get_token(),
      new_payload,
    )
  } catch (error) {
    await log_error(interaction.client, error as Error, "av_toggle_button", {
      user_id,
      guild_id: interaction.guildId || undefined,
    }).catch(() => {})
  }

  return true
}
