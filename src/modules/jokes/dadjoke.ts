import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
}                           from "discord.js"
import { Command }          from "../../shared/types/command"
import { component }        from "../../shared/utils"
import { log_error }        from "../../shared/utils/error_logger"

const indonesian_dad_jokes = [
  {
    setup    : "Ikan ikan apa yang suka ketawa?",
    punchline: "Ikan piranhahahaahaa",
  },
  {
    setup    : "Buah buah apa yang lucu?",
    punchline: "Buahahhahaha",
  },
  {
    setup    : "Kenapa luar angkasa menyeramkan?",
    punchline: "Karna galaksi menyeram kan karna galak si"
  },
  {
    setup    : "Kayu kayu apa yang krispi?",
    punchline: "Kayupukk",
  },
  {
    setup    : "Ikan ikan apa yang makan rumput?",
    punchline: "Ikan sapi sapi",
  },
  {
    setup    : "Apa makanan yang bisa bikin ketawa?",
    punchline: "Cilok baaaa",
  },
  {
    setup    : "Bas bas apa yang garing?",
    punchline: "Basreng",
  },
  {
    setup    : "Ikan ikan apa yang gak bisa gerak?",
    punchline: "Ikan pause",
  },
  {
    setup    : "Nasi nasi apa yang paling kasihan?",
    punchline: "Nasi kebuli",
  },
]

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("dadjoke")
    .setDescription("gajelas jir wkwk"),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const random_joke = indonesian_dad_jokes[Math.floor(Math.random() * indonesian_dad_jokes.length)]

      const payload = component.build_message({
        components: [
          component.container({
            components: [
              component.text(`**${random_joke.setup}**`),
              component.divider(),
              component.text(random_joke.punchline),
            ],
            accent_color: component.from_hex("#FFD700"),
          }),
        ],
      })

      await interaction.reply(payload)
    } catch (error) {
      await log_error(interaction.client, error as Error, "dadjoke_command", {
        user   : interaction.user.id,
        channel: interaction.channelId,
      })

      const error_payload = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Terjadi kesalahan saat mengambil lawakan. Silakan coba lagi nanti."),
            ],
            accent_color: component.from_hex("#FF0000"),
          }),
        ],
      })

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ ...error_payload, ephemeral: true })
      } else {
        await interaction.reply({ ...error_payload, ephemeral: true })
      }
    }
  },
}
