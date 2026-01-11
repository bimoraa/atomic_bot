import { StringSelectMenuInteraction } from "discord.js"
import { component, cache }            from "../../../../shared/utils"
import { log_error }                   from "../../../../shared/utils/error_logger"

/**
 * - HANDLE BYPASS SUPPORT TYPE SELECT - \\
 * 
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @returns {Promise<void>}
 */
export async function handle_bypass_support_type_select(interaction: StringSelectMenuInteraction): Promise<void> {
  let selected_type: string | undefined

  try {
    const [, interaction_id] = interaction.customId.split(":")
    selected_type            = interaction.values[0]

    // - GET CACHED SERVICES DATA - \\
    const cache_key        = `bypass_services_${interaction_id}`
    const grouped_services = cache.get<Record<string, any[]>>(cache_key)

    if (!grouped_services) {
      const expired_message = component.build_message({
        components: [
          component.container({
            components: [component.text("Session expired. Please run the command again.")],
          }),
        ],
      })

      expired_message.flags = (expired_message.flags ?? 0) | 64

      await interaction.reply(expired_message)
      return
    }

    const type_services = grouped_services[selected_type]

    if (!type_services || type_services.length === 0) {
      const empty_message = component.build_message({
        components: [
          component.container({
            components: [component.text("No services found for this type.")],
          }),
        ],
      })

      empty_message.flags = (empty_message.flags ?? 0) | 64

      await interaction.reply(empty_message)
      return
    }

    // - BUILD SERVICE LIST MESSAGE - \\
    const lines: string[] = [
      `## ${selected_type}`,
      `Total: **${type_services.length}** services`,
    ]

    for (const service of type_services) {
      const status_icon = service.status === "active" 
        ? "<:Green_Circle:1250450026233204797>" 
        : "<:Red_Circle:1250450004959821877>"
      
      const domains = service.domains?.length > 0
        ? service.domains.map((d: string) => `\`${d}\``).join(", ")
        : "N/A"

      lines.push(``)
      lines.push(`**${status_icon} ${service.name}**`)
      lines.push(`Domains: ${domains}`)
    }

    const response_message = component.build_message({
      components: [
        component.container({
          components: [component.text(lines)],
        }),
      ],
    })

    response_message.flags = (response_message.flags ?? 0) | 64

    await interaction.reply(response_message)

  } catch (error: any) {
    console.error(`[ - BYPASS SUPPORT TYPE SELECT - ] Error:`, error)

    await log_error(interaction.client, error as Error, "BYPASS SUPPORT TYPE SELECT", {
      custom_id: interaction.customId,
      user     : interaction.user.tag,
      channel  : interaction.channel?.id,
      selected : selected_type || "unknown",
    })

    try {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [component.text("An error occurred while processing your request")],
          }),
        ],
      })

      error_message.flags = (error_message.flags ?? 0) | 64

      await interaction.reply(error_message)
    } catch {
      // - IGNORE - \\
    }
  }
}
