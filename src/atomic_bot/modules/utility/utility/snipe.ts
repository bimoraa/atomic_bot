import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command }                   from "@shared/types/command"
import { component, api }            from "@shared/utils"
import { get_last_deleted_message }  from "../../../infrastructure/cache/snipe"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Show the last deleted message in this channel") as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true })

    const deleted = get_last_deleted_message(interaction.channel!.id)

    if (!deleted) {
      await api.edit_deferred_reply(interaction, component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                "## No Deleted Messages",
                "There are no recently deleted messages in this channel.",
              ]),
            ],
          }),
        ],
      }))
      return
    }

    const time_ago     = Math.floor((Date.now() - deleted.deleted_at) / 1000)
    const attachments  = deleted.attachments.length > 0 
      ? `\n\n**Attachments:**\n${deleted.attachments.map(url => `- ${url}`).join("\n")}`
      : ""

    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              "## Sniped Message",
              "",
              `**Author:** <@${deleted.author_id}> (${deleted.author_tag})`,
              `**Deleted:** <t:${Math.floor(deleted.deleted_at / 1000)}:R> (${time_ago}s ago)`,
              "",
              `**Content:**`,
              deleted.content || "(no text content)",
              attachments,
            ]),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
  },
}
