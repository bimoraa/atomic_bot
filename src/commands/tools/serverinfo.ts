import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
}                      from "discord.js"
import { Command }     from "../../types/command"
import { component }   from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("Show server information"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild

    if (!guild) {
      await interaction.reply({
        content   : "This command can only be used in a server.",
        ephemeral : true,
      })
      return
    }

    const owner            = await guild.fetchOwner()
    const member_count     = guild.memberCount
    const bot_count        = guild.members.cache.filter(m => m.user.bot).size
    const created_at       = `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
    const boost_level      = guild.premiumTier
    const boost_count      = guild.premiumSubscriptionCount || 0
    const text_channels    = guild.channels.cache.filter(c => c.isTextBased()).size
    const voice_channels   = guild.channels.cache.filter(c => c.isVoiceBased()).size
    const categories       = guild.channels.cache.filter(c => c.type === 4).size
    const roles_count      = guild.roles.cache.size
    const emojis_count     = guild.emojis.cache.size
    const stickers_count   = guild.stickers.cache.size

    const verification_levels = [
      "None",
      "Low",
      "Medium",
      "High",
      "Very High",
    ]
    const verification     = verification_levels[guild.verificationLevel] || "Unknown"
    const icon_url         = guild.iconURL({ size: 512 }) || ""

    const server_message = component.build_message({
      components: [
        component.container({
          components: [
            component.section({
              content   : `### ${guild.name}`,
              thumbnail : icon_url,
            }),
            component.divider(),
            component.text([
              "### General",
              `- Server ID: ${guild.id}`,
              `- Owner: <@${owner.id}>`,
              `- Created: ${created_at}`,
              `- Verification Level: ${verification}`,
            ]),
            component.divider(),
            component.text([
              "### Members",
              `- Total Members: ${member_count}`,
              `- Total Bots: ${bot_count}`,
            ]),
            component.divider(),
            component.text([
              "### Channels",
              `- Text: ${text_channels}`,
              `- Voice: ${voice_channels}`,
              `- Categories: ${categories}`,
            ]),
            component.divider(),
            component.text([
              "### Boosts",
              `- Level: ${boost_level}`,
              `- Boosts: ${boost_count}`,
            ]),
            component.divider(),
            component.text([
              "### Other",
              `- Roles: ${roles_count}`,
              `- Emojis: ${emojis_count}`,
              `- Stickers: ${stickers_count}`,
            ]),
          ],
        }),
      ],
    })

    await interaction.reply({
      ...server_message,
      ephemeral: true,
    })
  },
}
