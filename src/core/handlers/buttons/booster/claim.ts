import { ButtonInteraction } from "discord.js"
import * as booster_manager  from "../../../../shared/database/managers/booster_manager"
import { component, api }    from "../../../../shared/utils"

export async function handle(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith("booster_claim_")) return false

  await interaction.deferReply({ flags: 64 })

  const user_id  = interaction.customId.replace("booster_claim_", "")
  const guild_id = interaction.guild?.id

  if (!guild_id) {
    await interaction.editReply({ content: "Guild not found." })
    return true
  }

  const clicker_member = await interaction.guild?.members.fetch(interaction.user.id)
  if (!clicker_member?.premiumSince) {
    await interaction.editReply({ content: "You must boost this server!" })
    return true
  }

  if (user_id !== interaction.user.id) {
    await interaction.editReply({ content: "This button is not for you!" })
    return true
  }

  const member = await interaction.guild?.members.fetch(user_id)
  if (!member?.premiumSince) {
    await interaction.editReply({ content: "You are no longer boosting the server!" })
    return true
  }

  const boost_count = interaction.guild?.members.cache.filter(m => 
    m.id === user_id && m.premiumSince
  ).size || 0

  if (boost_count < 2) {
    await interaction.editReply({ content: "You need at least 2 boosts to claim the whitelist!" })
    return true
  }

  const is_whitelisted = await booster_manager.is_whitelisted(user_id, guild_id)
  
  if (is_whitelisted) {
    await interaction.editReply({ content: "You have already claimed your whitelist!" })
    return true
  }

  await booster_manager.add_whitelist(user_id, guild_id, boost_count)
  
  const user_avatar = interaction.user.displayAvatarURL({ extension: "png", size: 256 })

  const updated_message = component.build_message({
    components: [
      component.container({
        components: [
          component.section({
            content: [
              `## Server Boosted!`,
              `> Thank you so much for boosting the server, <@${user_id}>!`,
            ],
            media: user_avatar,
          }),
          component.action_row(
            component.secondary_button("Claim your 1 month SP Key", `booster_claim_${user_id}`, undefined, true)
          ),
        ],
      }),
    ],
  })

  await api.edit_components_v2(
    interaction.channel?.id || "",
    interaction.message.id,
    api.get_token(),
    updated_message
  )

  await interaction.editReply({ 
    content: "Whitelist claimed successfully! You now have access to 1 month SP Key." 
  })

  return true
}
