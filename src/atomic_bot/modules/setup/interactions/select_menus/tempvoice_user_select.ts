// - 临时语音用户选择菜单的交互注册 - \
// - registers the temp voice user select menu interaction - \
import { UserSelectMenuInteraction, GuildMember, VoiceChannel } from "discord.js"
import { UserSelectMenuHandler }                                from "@shared/types/interaction"
import * as tempvoice from "@shared/database/services/tempvoice"

export const user_select: UserSelectMenuHandler = {
  custom_id: /^tempvoice_(trust|untrust|invite|kick|block|unblock|transfer)_select:/,
  async execute(interaction: UserSelectMenuInteraction) {
    await interaction.deferUpdate()

    const [, action_raw, , channel_id] = interaction.customId.split(/_(select:)/)
    const action = action_raw.replace("tempvoice_", "")
    const target_id = interaction.values[0]

    if (!target_id || !channel_id) {
      await interaction.followUp({ content: "Invalid selection.", flags: 64 })
      return
    }

    const channel = interaction.guild?.channels.cache.get(channel_id) as VoiceChannel | undefined
    if (!channel) {
      await interaction.followUp({ content: "Channel not found.", flags: 64 })
      return
    }

    const member        = interaction.member as GuildMember
    const is_owner      = tempvoice.is_channel_owner(channel_id, member.id)
    const target_member = interaction.guild?.members.cache.get(target_id)

    if (!is_owner && action !== "invite") {
      await interaction.followUp({ content: "You must be the channel owner to do this.", flags: 64 })
      return
    }

    let success = false
    let reply   = ""

    switch (action) {
      case "trust": {
        success = await tempvoice.trust_user(channel, target_id)
        reply   = success ? `<@${target_id}> can now join your channel.` : "Failed to trust user."
        break
      }
      case "untrust": {
        success = await tempvoice.untrust_user(channel, target_id)
        reply   = success ? `<@${target_id}> has been untrusted.` : "Failed to untrust user."
        break
      }
      case "invite": {
        success = await tempvoice.invite_user(channel, target_id)
        reply   = success ? `<@${target_id}> has been invited.` : "Failed to invite user."
        break
      }
      case "kick": {
        success = await tempvoice.kick_user(channel, target_id)
        reply   = success ? `<@${target_id}> has been kicked from the channel.` : `<@${target_id}> is not in your channel.`
        break
      }
      case "block": {
        success = await tempvoice.block_user(channel, target_id)
        reply   = success ? `<@${target_id}> has been blocked.` : "Failed to block user."
        break
      }
      case "unblock": {
        success = await tempvoice.unblock_user(channel, target_id)
        reply   = success ? `<@${target_id}> has been unblocked.` : "Failed to unblock user."
        break
      }
      case "transfer": {
        if (!target_member) {
          reply = "User not found."
          break
        }
        success = await tempvoice.transfer_ownership(channel, member, target_id)
        reply   = success ? `Ownership transferred to <@${target_id}>.` : "Failed to transfer ownership."
        break
      }
    }

    await interaction.followUp({ content: reply, flags: 64 })
  },
}
