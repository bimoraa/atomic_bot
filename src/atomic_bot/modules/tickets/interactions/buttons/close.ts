// - 关闭票务按钮的交互注册 - \
// - registers the close ticket button interaction - \
import { ButtonInteraction, ThreadChannel } from "discord.js"
import { close_ticket }  from "@shared/database/unified_ticket"
import { ButtonHandler } from "@shared/types/interaction"

export async function handle(interaction: ButtonInteraction) {
  if (interaction.customId !== "priority_close") return false

  await interaction.deferReply({ flags: 64 })

  const thread = interaction.channel as ThreadChannel

  if (!thread.isThread()) {
    await interaction.editReply({ content: "This can only be used in a ticket thread." })
    return true
  }

  await close_ticket({
    thread,
    client:    interaction.client,
    closed_by: interaction.user,
  })

  await interaction.editReply({ content: "Ticket closed." })
  return true
}

export const button: ButtonHandler = {
  custom_id: "priority_close",
  execute: async (interaction) => { await handle(interaction) },
}
