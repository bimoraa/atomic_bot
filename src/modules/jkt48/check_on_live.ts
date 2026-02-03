import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../shared/types/command"
import { component }                                        from "../../shared/utils"
import { log_error }                                        from "../../shared/utils/error_logger"
import * as idn_live                                        from "../../infrastructure/api/idn_live"
import * as showroom_live                                   from "../../infrastructure/api/showroom_live"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check-on-live")
    .setDescription("Check which JKT48 members are currently live")
    .addStringOption((option) =>
      option
        .setName("platform")
        .setDescription("Choose the live platform")
        .setRequired(true)
        .addChoices(
          { name: "IDN", value: "idn" },
          { name: "Showroom", value: "showroom" }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply()

    try {
      const platform = interaction.options.getString("platform", true)
      const all_rooms = platform === "showroom"
        ? (await showroom_live.fetch_showroom_live_rooms(interaction.client)).map((room) => ({
            platform    : "Showroom",
            member_name : room.member_name,
            title       : room.title,
            viewers     : room.viewers,
            started_at  : room.started_at,
            url         : room.url,
            image       : room.image,
          }))
        : (await idn_live.get_live_rooms(interaction.client)).map((room) => ({
            platform    : "IDN",
            member_name : room.member_name,
            title       : room.title,
            viewers     : room.viewers,
            started_at  : room.started_at,
            url         : room.url,
            image       : room.image,
          }))

      const room_map = new Map<string, typeof all_rooms[number]>()
      for (const room of all_rooms) {
        if (!room.url) continue
        const key = [room.platform, room.member_name, room.url].join(":")
        if (!room_map.has(key)) {
          room_map.set(key, room)
        }
      }

      const live_rooms = Array.from(room_map.values())
        .sort((a, b) => b.started_at - a.started_at)

      if (live_rooms.length === 0) {
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
                  `No JKT48 members are currently live on ${platform === "showroom" ? "Showroom" : "IDN"}.`,
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
          component.text(`## Currently Live (${live_rooms.length})`),
        ],
      })

      const max_show = 5
      const shown_rooms = live_rooms.slice(0, max_show)
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
            component.section({
              content   : [
                `- **Viewers:** ${room.viewers.toLocaleString()}`,
                `- **Started:** <t:${started_timestamp}:R>`,
                `- **Watch URL:** ${room.url}`,
              ],
              accessory : room.image ? component.thumbnail(room.image) : undefined,
            }),
          ],
        })
      })

      const previous_member = live_rooms.length > 1
        ? live_rooms[live_rooms.length - 1]?.member_name
        : "None"
      const next_member = live_rooms.length > 1
        ? live_rooms[1]?.member_name
        : "None"
      const previous_disabled = live_rooms.length <= 1
      const next_disabled     = live_rooms.length <= 1
      const footer_component = component.container({
        components: [
          component.action_row(
            component.secondary_button(previous_member, "check_on_live_prev", undefined, previous_disabled),
            component.secondary_button(next_member, "check_on_live_next", undefined, next_disabled)
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
