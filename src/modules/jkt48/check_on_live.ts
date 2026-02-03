import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../shared/types/command"
import { component }                                        from "../../shared/utils"
import { log_error }                                        from "../../shared/utils/error_logger"
import * as idn_live                                        from "../../infrastructure/api/idn_live"
import * as showroom_live                                   from "../../infrastructure/api/showroom_live"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check-on-live")
    .setDescription("Check which JKT48 members are currently live on IDN or Showroom"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const idn_rooms      = await idn_live.get_live_rooms(interaction.client)
      const showroom_rooms = await showroom_live.fetch_showroom_live_rooms(interaction.client)
      const all_rooms = [
        ...idn_rooms.map((room) => ({
          platform   : "IDN",
          member_name: room.member_name,
          title      : room.title,
          viewers    : room.viewers,
          started_at : room.started_at,
          url        : room.url,
          image      : room.image,
        })),
        ...showroom_rooms.map((room) => ({
          platform   : "Showroom",
          member_name: room.member_name,
          title      : room.title,
          viewers    : room.viewers,
          started_at : room.started_at,
          url        : room.url,
          image      : room.image,
        })),
      ]
        .filter((room) => room.url)
        .sort((a, b) => b.started_at - a.started_at)

      if (all_rooms.length === 0) {
        const no_live_message = component.build_message({
          components: [
            component.container({
              accent_color : 0xFEE75C,
              components   : [
                component.text("## No Members Live"),
              ],
            }),
            component.container({
              components: [
                component.text([
                  "No JKT48 members are currently live on IDN or Showroom.",
                  "",
                  "Use `/notify add` to get notified when your favorite member goes live!",
                ]),
              ],
            }),
          ],
        })

        await interaction.editReply(no_live_message)
        return
      }

      const header_component = component.container({
        accent_color : 0x2ECC71,
        components   : [
          component.text(`## Currently Live (${all_rooms.length})`),
        ],
      })

      const max_show = 5
      const shown_rooms = all_rooms.slice(0, max_show)
      const live_components = shown_rooms.map((room) => {
        const started_timestamp = Math.floor(room.started_at / 1000)
        const description = room.title ? `> ${room.title}` : ""
        const section_text = [
          `### ${room.member_name} is LIVE on ${room.platform}!`,
          description,
        ].filter(Boolean)

        return component.container({
          components: [
            component.section({
              content   : section_text,
              accessory : component.link_button("Watch", room.url),
            }),
            component.divider(2),
            component.text([
              `- **Viewers:** ${room.viewers.toLocaleString()}`,
              `- **Started:** <t:${started_timestamp}:R>`,
              `- **Watch URL:** ${room.url}`,
            ]),
          ],
        })
      })

      const previous_disabled = true
      const next_disabled     = true
      const footer_component = component.container({
        components: [
          component.action_row(
            component.secondary_button("Previous", "check_on_live_prev", undefined, previous_disabled),
            component.secondary_button("Next", "check_on_live_next", undefined, next_disabled)
          ),
          component.divider(2),
          component.text(`Last Refreshed: <t:${Math.floor(Date.now() / 1000)}:R> - By **${interaction.user.username}**`),
        ],
      })

      const live_message = component.build_message({
        components : [
          header_component,
          ...live_components,
          footer_component,
        ],
      })

      await interaction.editReply(live_message)
    } catch (error) {
      await log_error(interaction.client, error as Error, "check_on_live_command", {})
      await interaction.editReply({
        content : "An error occurred while checking live streams.",
      }).catch(() => {})
    }
  },
}
