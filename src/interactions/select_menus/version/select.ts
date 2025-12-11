import { StringSelectMenuInteraction } from "discord.js"
import { time, format, component, version } from "../../../utils"

export async function handle_version_platform_select(interaction: StringSelectMenuInteraction): Promise<void> {
  const platform_name = interaction.values[0]

  await interaction.deferUpdate()

  const version_info = await version.get_platform_version_by_name(platform_name)

  if (!version_info) {
    const error_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`Failed to fetch ${platform_name} version.`),
          ],
        }),
      ],
    })

    await interaction.editReply({
      ...error_message,
    })
    return
  }

  const updated_timestamp = Math.floor(new Date(version_info.updated_at).getTime() / 1000)

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## ${platform_name} Version`,
              ``,
              `**Version:** ${format.code(version_info.version)}`,
              ``,
              `**Client Version:** ${format.code(version_info.client_version)}`,
              ``,
              `**Updated:** ${time.full_date_time(updated_timestamp)} (${time.relative_time(updated_timestamp)})`,
            ],
            thumbnail: format.logo_url,
          }),
        ],
      }),
    ],
  })

  await interaction.editReply({
    ...message,
  })
}
