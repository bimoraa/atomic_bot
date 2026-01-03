import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js"
import { Command }     from "../../../types/command"
import { component, api } from "../../../utils"
import { set_afk }     from "../../../services/afk"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status")
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for being AFK")
        .setRequired(false)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const reason = interaction.options.getString("reason") || "AFK"
    const member = interaction.guild?.members.cache.get(interaction.user.id)
    
    if (member) {
      const original_nickname = member.nickname
      const display_name      = member.displayName
      
      set_afk(interaction.user.id, reason, original_nickname)
      
      try {
        await member.setNickname(`[AFK] - ${display_name}`)
      } catch {}
    } else {
      set_afk(interaction.user.id, reason, null)
    }

    const afk_confirmation = component.build_message({
      components: [
        component.container({
          components: [
            component.text(`<@${interaction.user.id}> I set your AFK: ${reason}`),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...afk_confirmation,
      flags: (afk_confirmation.flags ?? 0) | 64,
    })
  },
}
