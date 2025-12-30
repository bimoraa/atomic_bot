import { StringSelectMenuInteraction, GuildMember, VoiceChannel } from "discord.js"
import * as tempvoice                                              from "../../../services/tempvoice"
import { component }                                               from "../../../utils"

function create_reply(message: string) {
  return component.build_message({
    components: [
      component.container({
        components: [
          component.text(message),
        ],
      }),
    ],
  })
}

export async function handle_tempvoice_region_select(interaction: StringSelectMenuInteraction): Promise<boolean> {
  if (interaction.customId !== "tempvoice_region_select") return false

  const member  = interaction.member as GuildMember
  const channel = member.voice.channel as VoiceChannel

  if (!channel || !tempvoice.is_temp_channel(channel.id)) {
    await interaction.reply({
      ...create_reply("You must be in your temporary voice channel to use this."),
      ephemeral: true,
    })
    return true
  }

  if (!tempvoice.is_channel_owner(channel.id, member.id)) {
    await interaction.reply({
      ...create_reply("Only the channel owner can change the region."),
      ephemeral: true,
    })
    return true
  }

  await interaction.deferUpdate()

  const selected_region = interaction.values[0]
  const region_value    = selected_region === "auto" ? null : selected_region

  const success = await tempvoice.set_region(channel, region_value)

  if (success) {
    const region_name = selected_region === "auto" ? "Automatic" : selected_region
    await interaction.editReply(create_reply(`Voice region set to **${region_name}**.`))
  } else {
    await interaction.editReply(create_reply("Failed to set region."))
  }

  return true
}
