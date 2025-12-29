import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js"
import { Command }                                          from "../../types/command"
import { component, time }                                  from "../../utils"

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("loa")
    .setDescription("View Leave of Absence panel"),

  async execute(interaction: ChatInputCommandInteraction) {
    const now = Math.floor(Date.now() / 1000)

    const loa_panel = component.build_message({
      components: [
        component.container({
          components  : [
            component.text("## Leave of Absence"),
          ],
        }),
        component.container({
          components: [
            component.text([
              `- Start Date: ${time.full_date_time(now)}`,
              `- End Date: Not set`,
            ]),
            component.divider(2),
            component.text([
              "- Type of Leave: Not set",
              "- Reason: Not set",
            ]),
          ],
        }),
        component.container({
          components: [
            component.action_row(
              component.secondary_button("Request LOA", "loa_request"),
              component.success_button("Approve", "loa_approve"),
              component.danger_button("Reject", "loa_reject")
            ),
          ],
        }),
      ],
    })

    await interaction.reply(loa_panel)
  },
}
