import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../../types/command"
import { component, db, format, time }                      from "../../../utils"

interface ghost_ping_entry {
  message_id : string
  author_id  : string
  author_tag : string
  channel_id : string
  guild_id   : string
  content    : string
  mentioned  : string[]
  timestamp  : number
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("check-ghost-ping")
    .setDescription("Check ghost pings where you were mentioned"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 })

    if (!db.is_connected()) {
      const error_message = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content  : "Database is not connected. This feature requires database connection.",
                thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
              }),
            ],
          }),
        ],
      })

      await interaction.editReply(error_message)
      return
    }

    const database        = db.get_db()
    const ghost_ping_coll = database.collection<ghost_ping_entry>("ghost_pings")

    const user_ghost_pings = await ghost_ping_coll
      .find({ mentioned: interaction.user.id })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray()

    if (user_ghost_pings.length === 0) {
      const no_ghost_pings = component.build_message({
        components: [
          component.container({
            components: [
              component.section({
                content  : "No ghost pings found where you were mentioned.",
                thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
              }),
            ],
          }),
        ],
      })

      await interaction.editReply(no_ghost_pings)
      return
    }

    const ghost_ping_entries = user_ghost_pings.map((entry) => {
      const author_mention  = format.user_mention(entry.author_id)
      const channel_mention = format.channel_mention(entry.channel_id)
      const timestamp_rel   = time.relative_time(Math.floor(entry.timestamp / 1000))
      const content_preview = format.truncate(entry.content || format.italic("No content"), 100)

      return [
        `${format.bold("Author:")} ${author_mention} (${format.code(entry.author_tag)})`,
        `${format.bold("Channel:")} ${channel_mention}`,
        `${format.bold("Time:")} ${timestamp_rel}`,
        `${format.bold("Message:")} ${content_preview}`,
      ].join("\n")
    })

    const total_count  = await ghost_ping_coll.countDocuments({ mentioned: interaction.user.id })
    const showing_text = user_ghost_pings.length < total_count 
      ? `Showing latest ${user_ghost_pings.length} of ${total_count} ghost pings`
      : `Showing all ${total_count} ghost pings`

    const result_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content  : [
                `## Your Ghost Pings`,
                format.italic(showing_text),
                "",
                ghost_ping_entries.join("\n\n" + format.subtext("─".repeat(40)) + "\n\n"),
              ],
              thumbnail: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
            }),
          ],
        }),
      ],
    })

    await interaction.editReply(result_message)
  },
}
