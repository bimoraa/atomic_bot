import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  VoiceChannel,
  StringSelectMenuBuilder,
  ActionRowBuilder,
}                     from "discord.js"
import { Command }    from "../../../shared/types/command"
import { component }  from "../../../shared/utils"
import { search_tracks }   from "../../../core/handlers/controllers/music_controller"
import { cache_search_results } from "../../../core/handlers/select_menus/music/play_select"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Search and play music")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Song name or artist")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as GuildMember
    const query  = interaction.options.getString("query", true)
    const guild  = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    const voice_channel = member.voice.channel as VoiceChannel

    if (!voice_channel) {
      await interaction.reply({
        content   : "You need to be in a voice channel to play music!",
        ephemeral : true,
      })
      return
    }

    if (!voice_channel.joinable) {
      await interaction.reply({
        content   : "I cannot join your voice channel!",
        ephemeral : true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const search_result = await search_tracks({ query, limit: 10, client: interaction.client })

    if (!search_result || search_result.length === 0) {
      await interaction.editReply({
        content: `No results found for "${query}"`,
      })
      return
    }

    cache_search_results(interaction.user.id, search_result)

    const select_menu = new StringSelectMenuBuilder()
      .setCustomId(`music_play_select:${interaction.user.id}`)
      .setPlaceholder("Select a track to play")
      .addOptions(
        search_result.map((track: any, index: number) => ({
          label      : track.title.length > 100 ? track.title.substring(0, 97) + "..." : track.title,
          description: `${track.author} - ${track.duration}`,
          value      : `${index}`,
        }))
      )

    const message = component.build_message({
      components: [
        component.container({
          accent_color: component.from_hex("1DB954"),
          components  : [
            component.section({
              content: [
                `Search Results for "${query}"`,
                "",
                `Found ${search_result.length} track${search_result.length > 1 ? "s" : ""}`,
                "Select a track from the dropdown below",
              ],
            }),
          ],
        }),
      ],
    })

    await interaction.editReply({
      ...message,
      components: [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select_menu),
      ],
    })
  },
}
