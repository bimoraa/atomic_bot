import { StringSelectMenuInteraction } from "discord.js"
import { cache }                       from "../../../shared/utils"

/**
 * - HANDLE BYPASS SUPPORT TYPE SELECT - \\
 * 
 * @param {StringSelectMenuInteraction} interaction - Select menu interaction
 * @returns {Promise<void>}
 */
export async function handle_bypass_support_type_select(interaction: StringSelectMenuInteraction): Promise<void> {
  try {
    const [, interaction_id] = interaction.customId.split(":")
    const selected_type      = interaction.values[0]

    // - GET CACHED SERVICES DATA - \\
    const cache_key        = `bypass_services_${interaction_id}`
    const grouped_services = cache.get<Record<string, any[]>>(cache_key)

    if (!grouped_services) {
      await interaction.reply({
        content   : "Session expired. Please run the command again.",
        ephemeral : true,
      })
      return
    }

    const type_services = grouped_services[selected_type]

    if (!type_services || type_services.length === 0) {
      await interaction.reply({
        content   : "No services found for this type.",
        ephemeral : true,
      })
      return
    }

    // - BUILD SERVICE LIST MESSAGE - \\
    let content_parts: string[] = []
    
    content_parts.push(`## ${selected_type}`)
    content_parts.push(`Total: **${type_services.length}** services`)
    content_parts.push("")

    for (const service of type_services) {
      const status_icon = service.status === "active" 
        ? "<:Green_Circle:1250450026233204797>" 
        : "<:Red_Circle:1250450004959821877>"
      
      const domains = service.domains?.length > 0
        ? service.domains.map((d: string) => `\`${d}\``).join(", ")
        : "N/A"

      content_parts.push(`**${status_icon} ${service.name}**`)
      content_parts.push(`Domains: ${domains}`)
      content_parts.push("")
    }

    await interaction.reply({
      content   : content_parts.join("\n"),
      flags     : 64,
    })

  } catch (error: any) {
    console.error(`[ - BYPASS SUPPORT TYPE SELECT - ] Error:`, error)

    try {
      await interaction.reply({
        content   : "An error occurred while processing your request",
        ephemeral : true,
      })
    } catch {
      // - IGNORE - \\
    }
  }
}
