import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command }                 from "../../../shared/types/command"
import { get_supported_services }  from "../../../core/handlers/shared/controller/bypass_controller"
import { component, api, cache }   from "../../../shared/utils"

/**
 * - BYPASS SUPPORT COMMAND - \\
 */
const bypass_support_command: Command = {
  data: new SlashCommandBuilder()
    .setName("bypass-support")
    .setDescription("View all supported bypass services"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      await interaction.deferReply()

      const loading_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Loading...",
                "",
                "Fetching supported services...",
              ]),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, loading_message)

      const services = await get_supported_services()

      if (!services || services.length === 0) {
        const error_message = component.build_message({
          components: [
            component.container({
              components: [
                component.text([
                  "## Error",
                  "",
                  "Failed to fetch supported services",
                ]),
              ],
            }),
          ],
        })

        await api.edit_deferred_reply(interaction, error_message)
        return
      }

      // - GROUP SERVICES BY TYPE - \\
      const grouped_services: Record<string, any[]> = {}
      
      for (const service of services) {
        const type = service.type || "Unknown"
        if (!grouped_services[type]) {
          grouped_services[type] = []
        }
        grouped_services[type].push(service)
      }

      // - CACHE SERVICES DATA - \\
      const cache_key = `bypass_services_${interaction.id}`
      cache.set(cache_key, grouped_services, 300000)

      // - BUILD DROPDOWN OPTIONS - \\
      const types          = Object.keys(grouped_services).sort()
      const dropdown_options = types.map(type => ({
        label       : type,
        value       : type,
        description : `${grouped_services[type].length} services`,
      }))

      const success_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content   : [
                  "## <:ticket:1411878131366891580> Supported Bypass Services",
                  `Atomic Guard provides reliable bypass support for ${services.length} services.`,
                  "",
                ],
                thumbnail : "https://github.com/bimoraa/atomic_bot/blob/main/assets/images/atomic_logo.png?raw=true",
              }),
              component.divider(2),
              component.select_menu(`bypass_support_type_select:${interaction.id}`, "Select a service type", dropdown_options),
              component.divider(1),
              component.text("-# Made by Ophelia."),
            ],
          }),
        ],
      })

      await api.edit_deferred_reply(interaction, success_message)

    } catch (error: any) {
      console.error(`[ - BYPASS SUPPORT - ] Error: ${error.message}`)

      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## Error",
                "",
                "An unexpected error occurred",
              ]),
            ],
          }),
        ],
      })

      try {
        await api.edit_deferred_reply(interaction, error_message)
      } catch {
        await interaction.editReply(error_message)
      }
    }
  },
}

export default bypass_support_command
