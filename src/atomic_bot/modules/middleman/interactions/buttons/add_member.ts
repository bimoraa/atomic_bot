// - 中间人「添加成员」按钮的交互注册 - \
// - registers the add member button for middleman tickets - \
import { ButtonInteraction, ThreadChannel } from "discord.js"
import { component }          from "@shared/utils"
import { get_ticket_config }  from "@shared/database/unified_ticket"
import { ButtonHandler }      from "@shared/types/interaction"

/**
 * @description Shows user select to add member to middleman ticket
 * @param {ButtonInteraction} interaction - The button interaction
 * @returns {Promise<boolean>} - Returns true if handled
 */
export async function handle_middleman_add_member(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith("middleman_add_member:")) return false

  const config           = get_ticket_config("middleman")
  const authorized_users = config?.authorized_users || []

  if (!authorized_users.includes(interaction.user.id)) {
    await interaction.reply({
      content  : "You don't have permission to use this button.",
      ephemeral: true,
    })
    return true
  }

  await interaction.deferReply({ ephemeral: true })

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text("## Add Member\nPilih user yang ingin ditambahkan ke ticket ini."),
          {
            type      : 1,
            components: [
              {
                type       : 5,
                custom_id  : `middleman_member_select:${interaction.channelId}`,
                placeholder: "Select member to add",
                min_values : 1,
                max_values : 1,
              },
            ],
          },
        ],
      }),
    ],
  })

  await interaction.editReply(message)
  return true
}

export const button: ButtonHandler = {
  custom_id: /^middleman_add_member:/,
  execute: async (interaction) => { await handle_middleman_add_member(interaction) },
}
