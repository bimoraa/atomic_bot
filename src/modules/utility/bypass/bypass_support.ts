import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command }                 from "../../../shared/types/command"
import { get_supported_services }  from "../../../core/handlers/shared/controller/bypass_controller"
import { component, api }          from "../../../shared/utils"

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
                "## <a:GTA_Loading:1459707117840629832> Loading...",
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
                  "## <:lcok:1417196069716234341> Error",
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

      // - BUILD MESSAGE COMPONENTS - \\
      const message_components: any[] = []

      message_components.push(
        component.text([
          "## <:checkmark:1417196825110253780> Supported Bypass Services",
          "",
          `Total Services: **${services.length}**`,
        ])
      )

      message_components.push(component.divider(2))

      // - ADD EACH TYPE SECTION - \\
      const types = Object.keys(grouped_services).sort()

      for (const type of types) {
        const type_services = grouped_services[type]
        
        message_components.push(
          component.text([
            `### ${type}`,
            `**Count:** ${type_services.length}`,
          ])
        )

        for (const service of type_services) {
          const status_icon = service.status === "active" ? "🟢" : "🔴"
          const domains     = service.domains?.length > 0 
            ? service.domains.slice(0, 3).map((d: string) => `\`${d}\``).join(", ") + 
              (service.domains.length > 3 ? ` +${service.domains.length - 3} more` : "")
            : "N/A"

          message_components.push(
            component.text([
              `**${status_icon} ${service.name}**`,
              `**Domains:** ${domains}`,
            ])
          )
        }

        message_components.push(component.divider(1))
      }

      const success_message = component.build_message({
        components: [
          component.container({
            components: message_components,
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
                "## <:lcok:1417196069716234341> Error",
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
