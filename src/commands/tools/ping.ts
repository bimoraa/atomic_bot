import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                      from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check bot latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    const initial_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("Pinging..."),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...initial_message,
      flags : 64,
    })

    const sent = await interaction.fetchReply()

    const ws_latency  = interaction.client.ws.ping
    const api_latency = sent.createdTimestamp - interaction.createdTimestamp

    const ping_message = component.build_message({
      components: [
        component.container({
          components: [
            component.text("### Ping"),
            component.divider(),
            component.text([
              `- WebSocket: ${ws_latency}ms`,
              `- API Latency: ${api_latency}ms`,
            ]),
          ],
        }),
      ],
    })

    await interaction.editReply(ping_message)
  },
}
