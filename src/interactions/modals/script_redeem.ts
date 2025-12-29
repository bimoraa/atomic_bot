import { ModalSubmitInteraction, GuildMember } from "discord.js"
import { component, api, env, format } from "../../utils"
import { redeem_user_key }             from "../controller/service_provider_controller"

const __script_role_id = env.get("LUARMOR_SCRIPT_ROLE_ID", "1398313779380617459")

export async function handle_script_redeem_modal(interaction: ModalSubmitInteraction): Promise<boolean> {
  if (interaction.customId !== "script_redeem_modal") return false

  await interaction.deferReply({ ephemeral: true })

  const member   = interaction.member as GuildMember
  const user_key = interaction.fields.getTextInputValue("user_key").trim()

  const result = await redeem_user_key({ client: interaction.client, user_id: member.id, user_key })

  if (!result.success) {
    const message = component.build_message({
      components: [
        component.container({
          components: [
            component.text([
              `## Error`,
              `${result.error}`,
            ]),
          ],
        }),
      ],
    })

    await api.edit_deferred_reply(interaction, message)
    return true
  }

  try {
    const guild = interaction.guild!
    const role  = guild.roles.cache.get(__script_role_id)
    if (role && !member.roles.cache.has(__script_role_id)) {
      await member.roles.add(role)
    }
  } catch {
  }

  const loader_script = result.script!

  const message = component.build_message({
    components: [
      component.container({
        components: [
          component.text([
            `## Key Redeemed Successfully!`,
            `Your key has been linked to your Discord account.`,
          ]),
        ],
      }),
      component.container({
        components: [
          component.text([
            `### Your Loader Script:`,
          ]),
          component.divider(),
          component.text([
            `\`\`\`lua`,
            loader_script,
            `\`\`\``,
          ]),
        ],
      }),
      component.container({
        components: [
          component.action_row(
            component.secondary_button("Mobile Copy", "mobile_copy"),
          ),
        ],
      }),
    ],
  })

  await api.edit_deferred_reply(interaction, message)
  return true
}
