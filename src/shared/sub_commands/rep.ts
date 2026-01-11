import { Message, Client } from "discord.js"
import { SubCommand }      from "../types/sub_command"
import { component }       from "../utils"
import * as reputation     from "../database/managers/reputation_manager"

const rep_command: SubCommand = {
  name       : "rep",
  description: "Give reputation to a user",

  async execute(message: Message, args: string[], client: Client) {
    const mentioned = message.mentions.users.first()
    
    if (!mentioned) {
      const usage = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Usage: `+rep @user note`"),
            ],
          }),
        ],
      })
      await message.reply(usage).catch(() => {})
      return
    }

    if (mentioned.id === message.author.id) {
      const error = component.build_message({
        components: [
          component.container({
            components: [
              component.text("You cannot give reputation to yourself."),
            ],
          }),
        ],
      })
      await message.reply(error).catch(() => {})
      return
    }

    if (mentioned.bot) {
      const error = component.build_message({
        components: [
          component.container({
            components: [
              component.text("You cannot give reputation to bots."),
            ],
          }),
        ],
      })
      await message.reply(error).catch(() => {})
      return
    }

    const can_give = await reputation.can_give_rep(message.author.id, message.guild!.id)
    
    if (!can_give) {
      const remaining = await reputation.get_cooldown_remaining(message.author.id, message.guild!.id)
      const cooldown  = component.build_message({
        components: [
          component.container({
            components: [
              component.text(`You can give reputation again in ${remaining} hours.`),
            ],
          }),
        ],
      })
      await message.reply(cooldown).catch(() => {})
      return
    }

    const note_parts = args.slice(1)
    const note       = note_parts.length > 0 ? note_parts.join(" ") : "No note provided"

    const success = await reputation.give_reputation(
      message.author.id,
      mentioned.id,
      message.guild!.id,
      note
    )

    if (success) {
      const user_rep = await reputation.get_reputation(mentioned.id, message.guild!.id)
      
      const confirmation = component.build_message({
        components: [
          component.container({
            components: [
              component.text([
                `You gave +1 reputation to <@${mentioned.id}>`,
                `**Note:** ${note}`,
                ``,
                `<@${mentioned.id}> now has **${user_rep?.total_rep || 1}** reputation.`,
              ]),
            ],
          }),
        ],
      })
      await message.reply(confirmation).catch(() => {})
    } else {
      const error = component.build_message({
        components: [
          component.container({
            components: [
              component.text("Failed to give reputation."),
            ],
          }),
        ],
      })
      await message.reply(error).catch(() => {})
    }
  },
}

export default rep_command
